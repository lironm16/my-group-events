import 'package:badges/badges.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/collapsing_navigation_drawer.dart';
import 'package:flutter_app_test/provider/facebook_sign_in.dart';
import 'package:flutter_app_test/provider/google_sign_in.dart';
import 'package:flutter_app_test/ui/homepage/add_event.dart';
import 'package:flutter_app_test/ui/homepage/home_page.dart';
import 'package:provider/provider.dart';

class LoggedInWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    List _elements = [
      {'name': 'John', 'group': 'Team A'},
      {'name': 'Will', 'group': 'Team B'},
      {'name': 'Beth', 'group': 'Team A'},
      {'name': 'Miranda', 'group': 'Team B'},
      {'name': 'Mike', 'group': 'Team C'},
      {'name': 'Danny', 'group': 'Team C'},
    ];
    final List<String> entries = <String>['A', 'B', 'C'];
    final List<int> colorCodes = <int>[600, 500, 100];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Color(0xFF436372),
        actions: [
          IconButton(
            icon: Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => AddEventPage(),
                ),
              );
            },
          ),
          Badge(
            position: BadgePosition.topEnd(top: 10, end: 10),
            badgeContent: Text('3'),
            child: IconButton(
              icon: Icon(Icons.notifications),
              onPressed: () {},
            ),
          ),
        ],
      ),
      body: MaterialApp(
        title: 'Flutter Demo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primaryColor: Color(0xFF436372),
        ),
        home: HomePage(),
      ),
      drawer: CollapsingNavigationDrawer(),
    );
  }
}
