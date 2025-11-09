import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  UnavailabilityScope,
  UnavailabilityStatus,
  UnavailabilityParticipantRole,
  Prisma,
} from '@prisma/client';

function normalizeDate(value: unknown, fallback?: Date): Date | null {
  const d = value ? new Date(value as string) : fallback ?? null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function expandZeroLengthRange(start: Date, end?: Date | null): { start: Date; end: Date } {
  if (!end || end.getTime() <= start.getTime()) {
    return { start, end: new Date(start.getTime() + 60_000) };
  }
  return { start, end };
}

function buildOverlapFilter(range: { start: Date; end: Date }): Prisma.EventWhereInput {
  return {
    startAt: { lt: range.end },
    OR: [
      {
        endAt: null,
        startAt: { gte: range.start },
      },
      {
        endAt: { gt: range.start },
      },
    ],
  };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    select: { id: true, familyId: true },
  });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const entries = await prisma.unavailability.findMany({
    where: {
      familyId: user.familyId ?? undefined,
      status: includeArchived ? undefined : { in: [UnavailabilityStatus.ACTIVE, UnavailabilityStatus.DRAFT] },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      group: {
        select: { id: true, nickname: true },
      },
    },
    orderBy: [
      { startAt: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return NextResponse.json({ unavailabilities: entries });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = await prisma.user.findFirst({
    where: { email: session.user.email },
    select: { id: true, familyId: true },
  });
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const startAt = normalizeDate(body?.startAt);
  const endAtRaw = normalizeDate(body?.endAt);
  if (!startAt) {
    return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
  }
  const { start: rangeStart, end: rangeEnd } = expandZeroLengthRange(startAt, endAtRaw ?? undefined);

  let scope: UnavailabilityScope;
  try {
    scope = body?.scope ? (body.scope.toUpperCase() as UnavailabilityScope) : UnavailabilityScope.INDIVIDUAL;
    if (!Object.values(UnavailabilityScope).includes(scope)) {
      scope = UnavailabilityScope.INDIVIDUAL;
    }
  } catch {
    scope = UnavailabilityScope.INDIVIDUAL;
  }

  const autoCancelHostedEvents = !!body?.autoCancelHostedEvents;
  const autoUpdateRsvps = !!body?.autoUpdateRsvps;
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : null;
  const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;
  const rsvpNote =
    typeof body?.rsvpNote === 'string' && body.rsvpNote.trim()
      ? body.rsvpNote.trim()
      : reason;

  const explicitParticipantIds = Array.isArray(body?.participantIds)
    ? body.participantIds.filter((value: unknown): value is string => typeof value === 'string')
    : [];
  const explicitPrimaryIds = Array.isArray(body?.primaryParticipantIds)
    ? body.primaryParticipantIds.filter((value: unknown): value is string => typeof value === 'string')
    : [];
  const explicitNotes: Record<string, string> =
    body?.participantNotes && typeof body.participantNotes === 'object'
      ? Object.entries(body.participantNotes).reduce<Record<string, string>>((acc, [key, value]) => {
          if (typeof value === 'string' && value.trim()) acc[key] = value.trim();
          return acc;
        }, {})
      : {};

  const participantIds = new Set<string>(explicitParticipantIds);
  if (scope === UnavailabilityScope.INDIVIDUAL && participantIds.size === 0) {
    participantIds.add(currentUser.id);
  }

  let groupId: string | null = null;
  if (scope === UnavailabilityScope.GROUP) {
    if (typeof body?.groupId !== 'string' || !body.groupId) {
      return NextResponse.json({ error: 'groupId required for group scope' }, { status: 400 });
    }
    const group = await prisma.group.findFirst({
      where: { id: body.groupId, familyId: currentUser.familyId ?? undefined },
      select: { id: true, memberships: { select: { userId: true } } },
    });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    groupId = group.id;
    for (const membership of group.memberships) {
      participantIds.add(membership.userId);
    }
  } else if (scope === UnavailabilityScope.FAMILY) {
    if (!currentUser.familyId) {
      return NextResponse.json({ error: 'No family context' }, { status: 400 });
    }
    const familyMembers = await prisma.familyMembership.findMany({
      where: { familyId: currentUser.familyId },
      select: { userId: true },
    });
    for (const member of familyMembers) {
      participantIds.add(member.userId);
    }
  }

  const participantIdList = Array.from(participantIds);
  if (participantIdList.length === 0) {
    return NextResponse.json({ error: 'No participants resolved' }, { status: 400 });
  }

  const validParticipants = await prisma.user.findMany({
    where: { id: { in: participantIdList } },
    select: { id: true, familyId: true },
  });
  if (validParticipants.length !== participantIdList.length) {
    return NextResponse.json({ error: 'One or more participants are invalid' }, { status: 400 });
  }
  for (const participant of validParticipants) {
    if (currentUser.familyId && participant.familyId !== currentUser.familyId) {
      return NextResponse.json({ error: 'Participant outside family scope' }, { status: 403 });
    }
  }

  const primaryIdSet = new Set<string>(explicitPrimaryIds.length ? explicitPrimaryIds : [currentUser.id]);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.unavailability.create({
        data: {
          title,
          reason,
          scope,
          startAt: rangeStart,
          endAt: endAtRaw ?? null,
          rsvpNote,
          autoCancelHostedEvents,
          autoUpdateRsvps,
          status: UnavailabilityStatus.ACTIVE,
          familyId: currentUser.familyId,
          groupId,
          createdById: currentUser.id,
        },
      });

      const participantRows = participantIdList.map((id) => ({
        unavailabilityId: created.id,
        userId: id,
        role: primaryIdSet.has(id) ? UnavailabilityParticipantRole.PRIMARY : UnavailabilityParticipantRole.MEMBER,
        note: explicitNotes[id] ?? null,
      }));
      if (participantRows.length) {
        await tx.unavailabilityParticipant.createMany({
          data: participantRows,
          skipDuplicates: true,
        });
      }

      const overlapFilter = buildOverlapFilter({ start: rangeStart, end: rangeEnd });

      const cancelledEventsMap = new Map<string, { id: string; title: string; startAt: Date; ownerId: string }>();
      const cancelledEventIds = new Set<string>();
      if (autoCancelHostedEvents) {
        const hostedWhere: Prisma.EventWhereInput = {
          ...overlapFilter,
          hostId: { in: participantIdList },
        };
        if (currentUser.familyId) {
          hostedWhere.familyId = currentUser.familyId;
        }
        const hostedEvents = await tx.event.findMany({
          where: hostedWhere,
          select: { id: true, title: true, startAt: true, hostId: true },
        });
        if (hostedEvents.length) {
          const eventIds = hostedEvents.map((event) => event.id);
          await tx.eventHost.deleteMany({ where: { eventId: { in: eventIds } } });
          await tx.rSVP.deleteMany({ where: { eventId: { in: eventIds } } });
          await tx.event.deleteMany({
            where: { id: { in: eventIds } },
          });
          for (const event of hostedEvents) {
            cancelledEventIds.add(event.id);
            cancelledEventsMap.set(event.id, {
              id: event.id,
              title: event.title,
              startAt: event.startAt,
              ownerId: event.hostId,
            });
          }
        }
      }

      const updatedRsvps: Array<{ id: string; eventId: string; userId: string }> = [];
      if (autoUpdateRsvps) {
        const eventFilter: Prisma.EventWhereInput = {
          ...overlapFilter,
        };
        if (currentUser.familyId) {
          eventFilter.familyId = currentUser.familyId;
        }
        const overlappingRsvps = await tx.rSVP.findMany({
          where: {
            userId: { in: participantIdList },
            event: eventFilter,
          },
          select: { id: true, userId: true, eventId: true, note: true },
        });

        for (const rsvp of overlappingRsvps) {
          if (cancelledEventIds.has(rsvp.eventId)) {
            continue;
          }
          await tx.rSVP.update({
            where: { id: rsvp.id },
            data: {
              status: 'DECLINED',
              note: rsvpNote
                ? rsvp.note
                  ? `${rsvp.note}\n\n${rsvpNote}`
                  : rsvpNote
                : rsvp.note,
            },
          });
          updatedRsvps.push({ id: rsvp.id, eventId: rsvp.eventId, userId: rsvp.userId });
        }
      }

      const unavailabilityWithParticipants = await tx.unavailability.findUnique({
        where: { id: created.id },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          group: {
            select: { id: true, nickname: true },
          },
        },
      });

      return {
        unavailability: unavailabilityWithParticipants,
        cancelledEvents: Array.from(cancelledEventsMap.values()),
        updatedRsvps,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[unavailability] Failed to create', error);
    return NextResponse.json({ error: 'Failed to create unavailability' }, { status: 500 });
  }
}
