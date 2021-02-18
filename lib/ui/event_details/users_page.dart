import 'package:flutter/material.dart';
import 'package:flutter_app_test/models/RecordList.dart';
import 'package:flutter_app_test/models/RecordService.dart';
import 'package:flutter_app_test/models/Record.dart';
import 'package:flutter_app_test/helpers/Constants.dart';
import 'package:flutter_app_test/overview/theme.dart';

class UsersPage extends StatefulWidget {
  @override
  _UsersPageState createState() {
    return _UsersPageState();
  }
}

class _UsersPageState extends State<UsersPage> {
  final TextEditingController _filter = new TextEditingController();

  RecordList _records = new RecordList();
  RecordList _filteredRecords = new RecordList();

  String _searchText = "";

  Icon _searchIcon = new Icon(Icons.search);

  Widget _appBarTitle = new Text(appTitle);

  @override
  void initState() {
    super.initState();

    _records.records = new List();
    _filteredRecords.records = new List();

    _getRecords();
  }

  void _getRecords() async {
    RecordList records = await RecordService().loadRecords();
    setState(() {
      for (Record record in records.records) {
        this._records.records.add(record);
        this._filteredRecords.records.add(record);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildBar(context),
      backgroundColor: appDarkGreyColor,
      body: _buildList(context),
      resizeToAvoidBottomPadding: false,
    );
  }

  Widget _buildBar(BuildContext context) {
    return new AppBar(
        elevation: 0.1,
        backgroundColor: appDarkGreyColor,
        centerTitle: true,
        title: _appBarTitle,
        leading: new IconButton(icon: _searchIcon, onPressed: _searchPressed));
  }

  Widget _buildList(BuildContext context) {
    if (!(_searchText.isEmpty)) {
      _filteredRecords.records = new List();
      for (int i = 0; i < _records.records.length; i++) {
        if (_records.records[i].name
                .toLowerCase()
                .contains(_searchText.toLowerCase()) ||
            _records.records[i].address
                .toLowerCase()
                .contains(_searchText.toLowerCase())) {
          _filteredRecords.records.add(_records.records[i]);
        }
      }
    }

    return ListView(
      padding: const EdgeInsets.only(top: 20.0),
      children: this
          ._filteredRecords
          .records
          .map((data) => _buildListItem(context, data))
          .toList(),
    );
  }

  Widget _buildListItem(BuildContext context, Record record) {
    return Card(
      key: ValueKey(record.name),
      elevation: 16.0,
      margin: new EdgeInsets.symmetric(horizontal: 10.0, vertical: 6.0),
      child: Container(
        decoration: BoxDecoration(
            color: appGreyColor), //Color.fromRGBO(64, 75, 96, .9)),
        child: ListTile(
          enabled: false,
          contentPadding:
              EdgeInsets.symmetric(horizontal: 10.0, vertical: 10.0),
          trailing: Container(
              padding: EdgeInsets.only(right: 0.0),
              // decoration: new BoxDecoration(
              //     border: new Border(
              //         left: new BorderSide(width: 1.0, color: darkTheme))),
              child: Hero(
                  tag: "avatar_" + record.name,
                  child: CircleAvatar(
                    radius: 32,
                    backgroundImage: NetworkImage(record.photo),
                  ))),
          title: Text(
            record.name,
            textAlign: TextAlign.right,
            style: TextStyle(color: darkTheme, fontWeight: FontWeight.normal),
          ),
          subtitle: Row(
            children: <Widget>[
              new Flexible(
                  child: new Column(
                      //crossAxisAlignment: CrossAxisAlignment.end,
                      children: <Widget>[
                    RichText(
                      textAlign: TextAlign.right,
                      text: TextSpan(
                        text: record.address,
                        style: TextStyle(color: darkTheme),
                      ),
                      maxLines: 3,
                      softWrap: true,
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          "מגיע",
                          textAlign: TextAlign.right,
                          style: eventDetailTextStyle.copyWith(
                            color: darkTheme,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        SizedBox(
                          width: 5,
                        ),
                        Icon(
                          Icons.event_available,
                          color: Colors.green,
                          size: 30,
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          "לא מגיע",
                          textAlign: TextAlign.right,
                          style: eventDetailTextStyle.copyWith(
                            color: darkTheme,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        SizedBox(
                          width: 5,
                        ),
                        Icon(
                          Icons.event_busy,
                          color: Colors.red,
                          size: 30,
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          "לא השיב",
                          textAlign: TextAlign.right,
                          style: eventDetailTextStyle.copyWith(
                            color: darkTheme,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        SizedBox(
                          width: 5,
                        ),
                        Icon(
                          Icons.event,
                          color: Colors.grey,
                          size: 30,
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          "לא החליט",
                          textAlign: TextAlign.right,
                          style: eventDetailTextStyle.copyWith(
                            color: darkTheme,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        SizedBox(
                          width: 5,
                        ),
                        Icon(
                          Icons.event_note,
                          color: Colors.orange,
                          size: 30,
                        ),
                      ],
                    ),
                  ]))
            ],
          ),
          leading: PopupMenuButton(
            icon: Icon(Icons.more_vert),
            itemBuilder: (BuildContext bc) => [
              PopupMenuItem(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        "הסר",
                        textAlign: TextAlign.right,
                        style: eventDetailTextStyle.copyWith(
                            color: Colors.black, fontWeight: FontWeight.normal),
                      ),
                      SizedBox(
                        width: 5,
                      ),
                      Icon(
                        Icons.person_remove,
                        color: Colors.red,
                        size: 30,
                      ),
                    ],
                  ),
                  value: "/newchat"),
              PopupMenuItem(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        "שלח תזכורת",
                        textAlign: TextAlign.right,
                        style: eventDetailTextStyle.copyWith(
                            color: Colors.black, fontWeight: FontWeight.normal),
                      ),
                      SizedBox(
                        width: 5,
                      ),
                      Icon(
                        Icons.notifications,
                        color: Colors.blue,
                        size: 30,
                      ),
                    ],
                  ),
                  value: "/new-group-chat"),
              PopupMenuItem(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        "הסר הזמנה",
                        textAlign: TextAlign.right,
                      ),
                      Icon(
                        Icons.close,
                        color: Colors.red,
                        size: 30,
                        semanticLabel: "הסר",
                      ),
                    ],
                  ),
                  value: "/newchat"),
            ],
          ),

          // IconButton(
          //   icon: Icon(Icons.more_vert),
          //   iconSize: 30.0,
          //   color: darkTheme,
          //   onPressed: () {
          //     Navigator.pop(context);
          //   },
          // ),
          onTap: () {
            // Navigator.push(
            //     context,
            //     MaterialPageRoute(
            //         builder: (context) => new DetailPage(record: record)));
          },
        ),
      ),
    );
  }

  _UsersPageState() {
    _filter.addListener(() {
      if (_filter.text.isEmpty) {
        setState(() {
          _searchText = "";
          _resetRecords();
        });
      } else {
        setState(() {
          _searchText = _filter.text;
        });
      }
    });
  }

  void _resetRecords() {
    this._filteredRecords.records = new List();
    for (Record record in _records.records) {
      this._filteredRecords.records.add(record);
    }
  }

  void _searchPressed() {
    setState(() {
      if (this._searchIcon.icon == Icons.search) {
        this._searchIcon = new Icon(Icons.close);
        this._appBarTitle = new TextField(
          controller: _filter,
          style: new TextStyle(color: Colors.white),
          decoration: new InputDecoration(
            prefixIcon: new Icon(Icons.search, color: Colors.white),
            fillColor: Colors.white,
            hintText: 'Search by name',
            hintStyle: TextStyle(color: Colors.white),
          ),
        );
      } else {
        this._searchIcon = new Icon(Icons.search);
        this._appBarTitle = new Text(appTitle);
        _filter.clear();
      }
    });
  }
}
