import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/theme.dart';
import 'package:google_fonts/google_fonts.dart';

class CollapsingListTile extends StatefulWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final Function onTap;

  CollapsingListTile(
      {@required this.title,
      @required this.icon,
      this.isSelected = false,
      this.onTap});
  @override
  _CollapsingListTileState createState() => _CollapsingListTileState();
}

class _CollapsingListTileState extends State<CollapsingListTile> {
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: widget.onTap,
      child: Container(
        decoration: BoxDecoration(
            borderRadius: BorderRadius.all(Radius.circular(16.0)),
            color: widget.isSelected
                ? Colors.transparent.withOpacity(0.3)
                : Colors.transparent),
        margin: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        child: Row(
          children: [
            Icon(
              widget.icon,
              color: widget.isSelected ? Colors.white : Colors.white30,
              size: 38.0,
            ),
            SizedBox(
              width: 10.0,
            ),
            Text(widget.title,
                style: widget.isSelected
                    ? listTitleSelectedTextStyle
                    : listTitleDefaultTextStyle),
          ],
        ),
      ),
    );
  }
}
