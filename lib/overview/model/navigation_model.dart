import 'package:flutter/material.dart';

class NavigationModel {
  String title;
  IconData icon;

  NavigationModel({this.title, this.icon});
}

List<NavigationModel> navigationItems = [
  NavigationModel(title: "מסך הבית", icon: Icons.home),
  NavigationModel(title: "שגיאות", icon: Icons.error),
  NavigationModel(title: "חיפוש", icon: Icons.search),
  NavigationModel(title: "הודעות", icon: Icons.notifications),
  NavigationModel(title: "הגדרות", icon: Icons.settings),
  NavigationModel(title: "התנתק", icon: Icons.logout),
];
