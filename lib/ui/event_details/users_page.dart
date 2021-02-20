import 'package:flutter/material.dart';
import 'package:flutter_app_test/models/RecordList.dart';
import 'package:flutter_app_test/models/RecordService.dart';
import 'package:flutter_app_test/models/Record.dart';
import 'package:flutter_app_test/helpers/Constants.dart';
import 'package:flutter_app_test/overview/theme.dart';

enum Status { coming, notComing, maybe, unknown }

class StatusItem {
  final int status;

  Color color = Colors.grey;
  IconData icon = Icons.calendar_today;
  String title = "לא ידוע";

  StatusItem({this.status}) {
    if (status == Status.coming.index) {
      this.color = Colors.green;
      this.icon = Icons.event_available;
      this.title = "מגיע";
    } else if (status == Status.notComing.index) {
      this.color = Colors.red;
      this.icon = Icons.event_busy;
      this.title = "לא מגיע";
    } else if (status == Status.maybe.index) {
      this.color = Colors.orange;
      this.icon = Icons.event_note;
      this.title = "אולי";
    }
  }
}

class StatusRow extends StatelessWidget {
  final StatusItem statusItem;

  StatusRow({this.statusItem});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          statusItem.title,
          textAlign: TextAlign.right,
          style: eventDetailTextStyle.copyWith(
              color: darkTheme, fontWeight: FontWeight.normal, fontSize: 16.0),
        ),
        SizedBox(
          width: 3,
        ),
        Icon(
          statusItem.icon,
          color: statusItem.color,
          size: 20,
        )
      ],
    );
  }
}

class UsersPage extends StatefulWidget {
  @override
  _UsersPageState createState() {
    return _UsersPageState();
  }
}

class _UsersPageState extends State<UsersPage>
    with SingleTickerProviderStateMixin {
  final TextEditingController _filter = new TextEditingController();

  RecordList _records = new RecordList();
  RecordList _filteredRecords = new RecordList();

  String _searchText = "";

  Icon _searchIcon = new Icon(Icons.search);

  Widget _appBarTitle = new Text(appTitle);
  TabController _tabController;
  int _activeTabIndex = 0;

  final List<Tab> myTabs = <Tab>[
    Tab(
      text: "לא ידוע",
      icon: Icon(
        Icons.calendar_today,
        color: Colors.grey,
        size: 30,
      ),
    ),
    Tab(
      text: "אולי",
      icon: Icon(
        Icons.event_note,
        color: Colors.orange,
        size: 30,
      ),
    ),
    Tab(
      text: "לא מגיע",
      icon: Icon(
        Icons.event_busy,
        color: Colors.red,
        size: 30,
      ),
    ),
    Tab(
      text: "מגיע",
      icon: Icon(Icons.event_available, color: Colors.green, size: 30),
    ),
    Tab(text: "הכל", icon: Icon(Icons.event, color: Colors.white, size: 30)),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = new TabController(
        vsync: this, length: myTabs.length, initialIndex: myTabs.length - 1);
    _records.records = new List();
    _filteredRecords.records = new List();

    _getRecords();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: _buildBar(context),
        backgroundColor: appDarkGreyColor,
        body: _buildList(context),
        resizeToAvoidBottomPadding: false,
      ),
    );
  }

  Widget _buildBar(BuildContext context) {
    return new AppBar(
      elevation: 0.1,
      backgroundColor: appDarkGreyColor,
      centerTitle: true,
      title: _appBarTitle,
      bottom: TabBar(
        controller: _tabController,
        labelPadding: EdgeInsets.symmetric(horizontal: 2.0),
        tabs: myTabs,
        onTap: (index) {
          _tabPressed(index);
        },
      ),
      actions: [
        IconButton(icon: _searchIcon, onPressed: _searchPressed),
      ],
    );
  }

  Widget _buildList(BuildContext context) {
    _filteredRecords.records = new List();
    for (int i = 0; i < _records.records.length; i++) {
      bool inCategory = _activeTabIndex == 0 ||
          _records.records[i].status == _activeTabIndex - 1;
      bool inSearch = _searchText.isEmpty ||
          (_records.records[i].name.contains(_searchText) ||
              _records.records[i].address
                  .toLowerCase()
                  .contains(_searchText.toLowerCase()));
      bool inSearch2 = _searchText.isEmpty ||
          (_records.records[i].name
                  .toLowerCase()
                  .contains(_searchText.toLowerCase()) ||
              _records.records[i].address
                  .toLowerCase()
                  .contains(_searchText.toLowerCase()));
      if (inCategory && inSearch) {
        _filteredRecords.records.add(_records.records[i]);
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
                    StatusRow(statusItem: StatusItem(status: record.status)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        RichText(
                          textAlign: TextAlign.right,
                          text: TextSpan(
                            text: record.address,
                            style: TextStyle(
                              color: Colors.black45,
                            ),
                          ),
                          maxLines: 3,
                          softWrap: true,
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

  void _tabPressed(int index) {
    setState(() {
      _activeTabIndex = _tabController.length - index - 1;
    });
  }

  void _searchPressed() {
    setState(() {
      if (this._searchIcon.icon == Icons.search) {
        this._searchIcon = new Icon(Icons.close);
        this._appBarTitle = new TextField(
          controller: _filter,
          textAlign: TextAlign.end,
          style: new TextStyle(color: Colors.white),
          decoration: new InputDecoration(
            suffixIcon: new Icon(Icons.search, color: Colors.white),
            fillColor: Colors.white,
            hintText: 'חפש',
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
