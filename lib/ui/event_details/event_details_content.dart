import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/theme.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../model/event.dart';
import '../../model/guest.dart';
import '../../styleguide.dart';

class EventDetailsContent extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final event = Provider.of<Event>(context);
    final screenWidth = MediaQuery.of(context).size.width;

    return SingleChildScrollView(
      child: Container(
        color: Color(0xFF436372),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            if (event.galleryImages.isNotEmpty)
              CarouselSlider(
                items: event.galleryImages
                    .map((item) => Container(
                          child: Image.asset(item),
                        ))
                    .toList(),
                options: CarouselOptions(
                  reverse: true,
                  autoPlay: true,
                  enlargeCenterPage: true,
                  enableInfiniteScroll: true,
                ),
              ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 0.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Column(
                    children: [
                      Text(
                        event.title,
                        textAlign: TextAlign.center,
                        style: eventDetailSubHeaderStyle.copyWith(
                          fontSize: 60.0,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text(
                "מתי",
                textAlign: TextAlign.right,
                style: eventDetailSubHeaderStyle,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: <Widget>[
                  Text(
                    "היום, 18:00",
                    style: eventDetailTextStyle,
                  ),
                  SizedBox(
                    width: 5,
                  ),
                  Icon(
                    Icons.schedule,
                    color: Colors.white,
                    size: 20,
                  ),
                ],
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text(
                "איפה",
                textAlign: TextAlign.right,
                style: eventDetailSubHeaderStyle,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: <Widget>[
                  Text(
                    event.location,
                    style: eventDetailTextStyle,
                  ),
                  SizedBox(
                    width: 5,
                  ),
                  Icon(
                    Icons.location_on,
                    color: Colors.white,
                    size: 20,
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 10,
            ),
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Text(
                " < מי מגיע",
                textAlign: TextAlign.right,
                style: eventDetailSubHeaderStyle,
              ),
            ),
            SingleChildScrollView(
              reverse: true,
              scrollDirection: Axis.horizontal,
              child: Row(
                children: <Widget>[
                  for (final guest in guests)
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: ClipOval(
                        child: Image.asset(
                          guest.imagePath,
                          width: 90,
                          height: 90,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text(
                "מה הולך להיות",
                textAlign: TextAlign.right,
                style: eventDetailSubHeaderStyle,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                event.punchLine1,
                textAlign: TextAlign.right,
                style: eventDetailTextStyle,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Text(
                event.punchLine2,
                textAlign: TextAlign.right,
                style: eventDetailTextStyle,
              ),
            ),
            if (event.description.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  event.description,
                  textAlign: TextAlign.right,
                  style: eventDetailTextStyle,
                ),
              ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text(
                "לינק לאירוע",
                textAlign: TextAlign.right,
                style: eventDetailSubHeaderStyle,
              ),
            ),
            if (event.galleryImages.isNotEmpty)
              Padding(
                padding:
                    const EdgeInsets.only(right: 16.0, top: 16, bottom: 16),
                child: Text(
                  "גלריה",
                  style: guestTextStyle,
                ),
              ),
            SingleChildScrollView(
              reverse: true,
              scrollDirection: Axis.horizontal,
              child: Row(
                children: <Widget>[
                  for (final galleryImagePath in event.galleryImages)
                    Container(
                      margin: const EdgeInsets.only(
                          left: 16, right: 16, bottom: 32),
                      child: ClipRRect(
                        borderRadius: BorderRadius.all(Radius.circular(20)),
                        child: Image.asset(
                          galleryImagePath,
                          width: 180,
                          height: 180,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
