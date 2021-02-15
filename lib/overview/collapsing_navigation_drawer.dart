import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/model/navigation_model.dart';
import 'package:flutter_app_test/overview/theme.dart';

import 'collapsing_list_tile.dart';

class CollapsingNavigationDrawer extends StatefulWidget {
  @override
  _CollapsingNavigationDrawerState createState() =>
      _CollapsingNavigationDrawerState();
}

class _CollapsingNavigationDrawerState
    extends State<CollapsingNavigationDrawer> {
  int currentSelectedIndex = 0;
  final user = FirebaseAuth.instance.currentUser;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 80,
      child: Container(
        width: 220.0,
        color: drawerBackgroundColor,
        child: Column(
          children: <Widget>[
            SizedBox(height: 50),
            Container(
                alignment: Alignment.center,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(height: 8),
                    CircleAvatar(
                      maxRadius: 25,
                      backgroundImage: NetworkImage(user.photoURL),
                    ),
                    SizedBox(height: 8),
                    Text(
                      user.displayName,
                      style: TextStyle(color: Colors.white),
                    ),
                  ],
                )),
            // SizedBox(height: 50),
            // CollapsingListTile(title: "Liron Matityahu", icon: Icons.person),
            Divider(
              color: Colors.grey,
              height: 40.0,
            ),
            Expanded(
              child: ListView.builder(
                itemBuilder: (context, counter) {
                  return CollapsingListTile(
                      onTap: () {
                        setState(() {
                          currentSelectedIndex = counter;
                        });
                      },
                      isSelected: currentSelectedIndex == counter,
                      title: navigationItems[counter].title,
                      icon: navigationItems[counter].icon);
                },
                itemCount: navigationItems.length,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
