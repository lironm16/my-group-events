import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/collapsing_navigation_drawer.dart';
import 'package:flutter_app_test/provider/facebook_sign_in.dart';
import 'package:flutter_app_test/provider/google_sign_in.dart';
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
        title: Center(
          child: Text(
            "האירועים שלי",
            textAlign: TextAlign.center,
          ),
        ),
        actions: <Widget>[
          IconButton(
            icon: Icon(
              Icons.add_circle_outline_rounded,
              color: Colors.white,
            ),
            onPressed: () {
              // do something
            },
          )
        ],
      ),
      body: MaterialApp(
        title: 'Flutter Demo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          scaffoldBackgroundColor: Color(0xFFFFFFFF),
          primaryColor: Color(0xFFFF4700),
        ),
        home: HomePage(),
      ),
      drawer: CollapsingNavigationDrawer(),
    );
  }
}

// Drawer(
// // Add a ListView to the drawer. This ensures the user can scroll
// // through the options in the drawer if there isn't enough vertical
// // space to fit everything.
// child: ListView(
// // Important: Remove any padding from the ListView.
// padding: EdgeInsets.zero,
// children: <Widget>[
// DrawerHeader(
// child: Container(
// alignment: Alignment.center,
// child: Column(
// crossAxisAlignment: CrossAxisAlignment.center,
// mainAxisAlignment: MainAxisAlignment.center,
// children: [
// SizedBox(height: 8),
// CircleAvatar(
// maxRadius: 25,
// backgroundImage: NetworkImage(user.photoURL),
// ),
// SizedBox(height: 8),
// Text(
// user.displayName,
// style: TextStyle(color: Colors.white),
// ),
// ],
// ),
// ),
// decoration: BoxDecoration(
// color: Colors.purple,
// ),
// ),
// ListTile(
// title: Text('Logout'),
// onTap: () {
// final provider =
// Provider.of<GoogleSignInProvider>(context, listen: false);
// provider.logout();
// },
// ),
// ListTile(
// title: Text('Item 2'),
// onTap: () {
// // Update the state of the app
// // ...
// // Then close the drawer
// Navigator.pop(context);
// },
// ),
// ],
// ),
// )
