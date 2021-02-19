import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/theme.dart';
import 'package:flutter_app_test/ui/event_details/users_page.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../model/event.dart';
import '../../model/guest.dart';

class EventDetailsContent extends StatelessWidget {
  launchURL(url) async {
    if (await canLaunch(url)) {
      await launch(url);
    } else {
      throw 'Could not launch $url';
    }
  }

  @override
  Widget build(BuildContext context) {
    final event = Provider.of<Event>(context);
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      appBar: AppBar(
          title: Text(
            event.title,
            style: eventDetailTextStyle,
          ),
          backgroundColor: darkTheme),
      backgroundColor: darkTheme,
      body: Container(
        padding: EdgeInsets.all(10.0),
        child: SingleChildScrollView(
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
                    Text(
                      event.title,
                      textAlign: TextAlign.center,
                      style: eventDetailTextStyle.copyWith(
                          fontSize: 30.0, color: lightTheme),
                    ),
                  ],
                ),
              ),
              EventDetailsLine(
                title: "מתי",
                desc: "היום, 18:00",
                iconData: Icons.schedule,
              ),
              EventDetailsLine(
                title: "איפה",
                desc: event.location,
                iconData: Icons.location_on,
              ),
              EventDetailsLine(
                title: "מי מארגן",
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => UsersPage(),
                    ),
                  );
                },
              ),
              Padding(
                padding: const EdgeInsets.all(8),
                child: ClipOval(
                  child: Image.asset(
                    guests[0].imagePath,
                    width: 90,
                    height: 90,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              EventDetailsLine(
                title: "< מי מגיע",
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => UsersPage(),
                    ),
                  );
                },
              ),
              SingleChildScrollView(
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
              EventDetailsLine(
                title: "מה הולך להיות",
                desc: event.description,
              ),
              EventDetailsLine(
                title: "< לינק לאירוע",
                onPressed: () {
                  String url = "https://pub.dev/packages/url_launcher";
                  launchURL(url);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class EventDetailsLine extends StatefulWidget {
  final String title;
  final String desc;
  final IconData iconData;
  final VoidCallback onPressed;
  EventDetailsLine({this.title, this.desc, this.iconData, this.onPressed});

  @override
  _EventDetailsLineState createState() => _EventDetailsLineState();
}

class _EventDetailsLineState extends State<EventDetailsLine> {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                child: Text(
                  widget.title,
                  textAlign: TextAlign.right,
                  style: eventDetailSubHeaderStyle,
                ),
                onPressed: widget.onPressed,
              ),
            ],
          ),
          if (widget.desc != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: <Widget>[
                  Flexible(
                    child: Text(
                      widget.desc,
                      textAlign: TextAlign.right,
                      style: eventDetailTextStyle,
                    ),
                  ),
                  if (widget.iconData != null)
                    SizedBox(
                      width: 5,
                    ),
                  if (widget.iconData != null)
                    Icon(
                      widget.iconData,
                      color: Colors.white,
                      size: 20,
                    ),
                ],
              ),
            )
        ],
      ),
    );
  }
}
