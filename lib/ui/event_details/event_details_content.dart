import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
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

    final style = TextStyle(
      fontSize: 24.0,
      fontWeight: FontWeight.bold,
      color: Color(0xFF436372),
    );

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
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 40.0,
              ),
              child: Card(
                color: Color(0xFFfcc56a),
                elevation: 4,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.all(Radius.circular(18))),
                child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      //mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              event.title,
                              textAlign: TextAlign.right,
                              style: GoogleFonts.assistant(
                                fontSize: 25.0,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF436372),
                              ),
                            ),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: <Widget>[
                            Text(
                              event.location,
                              style: GoogleFonts.assistant(
                                fontSize: 20.0,
                                fontWeight: FontWeight.normal,
                                color: Color(0xFF436372),
                              ),
                            ),
                            SizedBox(
                              width: 5,
                            ),
                            Icon(
                              Icons.location_on,
                              color: Color(0xFF436372),
                              size: 15,
                            ),
                          ],
                        ),
                      ],
                    )),
              ),
            ),
            SizedBox(
              height: 20,
            ),
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Text(
                ":${guests.length}" + " מגיעים",
                textAlign: TextAlign.right,
                style: guestTextStyle,
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
              padding: const EdgeInsets.all(16),
              child: RichText(
                text: TextSpan(children: [
                  TextSpan(
                    text: event.punchLine1,
                    style: punchLine1TextStyle,
                  ),
                  TextSpan(
                    text: event.punchLine2,
                    style: punchLine2TextStyle,
                  ),
                ]),
              ),
            ),
            if (event.description.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  event.description,
                  style: eventLocationTextStyle,
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
