import 'package:flutter/material.dart';

TextStyle listTitleDefaultTextStyle = eventDetailTextStyle.copyWith(
    color: Colors.white70, fontSize: 20.0, fontWeight: FontWeight.w600);

TextStyle listTitleSelectedTextStyle = listTitleDefaultTextStyle.copyWith(
  color: Colors.white,
);

Color selectedColor = Color(0xFF4AC8EA);
Color drawerBackgroundColor = Color(0xFF272D34);

Color lightTheme = Color(0xFFfcc56a);
Color darkTheme = Color(0xFF436372);

final eventDetailSubHeaderStyle = TextStyle(
  fontSize: 28.0,
  fontFamily: "DanaYadAlefAlefAlef",
  fontWeight: FontWeight.bold,
  color: lightTheme,
);

final eventDetailTextStyle = TextStyle(
  fontSize: 20.0,
  fontFamily: "yehudaclm light",
  fontWeight: FontWeight.bold,
  color: Colors.white,
);
