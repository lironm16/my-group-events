import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class Category {
  final int categoryId;
  final String name;
  final IconData icon;

  Category({this.categoryId, this.name, this.icon});
}

final allCategory = Category(
  categoryId: 0,
  name: "הכל",
  icon: Icons.search,
);

final musicCategory = Category(
  categoryId: 1,
  name: "אירוע",
  icon: Icons.music_note,
);

final meetUpCategory = Category(
  categoryId: 2,
  name: "Meetup",
  icon: Icons.location_on,
);

final golfCategory = Category(
  categoryId: 3,
  name: "ארוחה",
  icon: Icons.local_dining,
);

final birthdayCategory = Category(
  categoryId: 4,
  name: "יום הולדת",
  icon: Icons.cake,
);

final categories = [
  meetUpCategory,
  golfCategory,
  musicCategory,
  birthdayCategory,
  allCategory,
];
