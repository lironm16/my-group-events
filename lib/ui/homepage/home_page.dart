import 'package:flutter/material.dart';
import 'package:flutter_app_test/model/category.dart';
import 'package:flutter_app_test/model/event.dart';
import 'package:flutter_app_test/styleguide.dart';
import 'package:flutter_app_test/ui/event_details/event_details_page.dart';
import 'package:provider/provider.dart';

import '../../app_state.dart';
import 'category_widget.dart';
import 'event_widget.dart';
import 'home_page_background.dart';

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ChangeNotifierProvider<AppState>(
        create: (_) => AppState(),
        child: Stack(
          children: <Widget>[
            HomePageBackground(
              screenHeight: MediaQuery.of(context).size.height,
            ),
            SingleChildScrollView(
              child: Column(
                children: <Widget>[
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24.0),
                    child: Consumer<AppState>(
                      builder: (context, appState, _) => SingleChildScrollView(
                        reverse: true,
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: <Widget>[
                            for (final category in categories)
                              CategoryWidget(category: category)
                          ],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Consumer<AppState>(
                      builder: (context, appState, _) => Column(
                        children: <Widget>[
                          for (final event in events.where((e) => e.categoryIds
                              .contains(appState.selectedCategoryId)))
                            GestureDetector(
                              onTap: () {
                                Navigator.of(context, rootNavigator: true).push(
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        EventDetailsPage(event: event),
                                    //fullscreenDialog: true,
                                  ),
                                );
                              },
                              child: EventWidget(
                                event: event,
                              ),
                            )
                        ],
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
