import 'package:datetime_picker_formfield/datetime_picker_formfield.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app_test/overview/theme.dart';
import 'package:flutter_form_bloc/flutter_form_bloc.dart';
import 'package:searchable_dropdown/searchable_dropdown.dart';

import 'extended_text_field.dart';

class MyStatefulWidget extends StatefulWidget {
  MyStatefulWidget({Key key}) : super(key: key);

  @override
  _MyStatefulWidgetState createState() => _MyStatefulWidgetState();
}

/// This is the private State class that goes with MyStatefulWidget.
class _MyStatefulWidgetState extends State<MyStatefulWidget> {
  String dropdownValue = 'ארוחה';
  final bool isEnabled = false;
  final List<DropdownMenuItem> items = [];
  String selectedValue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: Text(
            'יצירת אירוע חדש',
            style: eventDetailTextStyle,
          ),
          backgroundColor: darkTheme),
      backgroundColor: darkTheme,
      body: SingleChildScrollView(
          child: Container(
        padding: const EdgeInsets.all(10.0),
        alignment: Alignment.centerRight,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              "שם האירוע",
              style: eventDetailTextStyle,
            ),
            SizedBox(
              height: 5.0,
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(15.0),
              child: Container(
                  color: lightTheme,
                  child: TextFormField(
                    style: eventDetailTextStyle.copyWith(color: Colors.black),
                    textAlign: TextAlign.right,
                    textDirection: TextDirection.rtl,
                    autocorrect: false,
                    //maxLength: 250,
                    decoration: InputDecoration(
                      //hintText: 'שם האירוע',
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 16.0, vertical: 16),
                      border: InputBorder.none,
                    ),
                  )),
            ),
            SizedBox(
              height: 5.0,
            ),
            Text(
              "תיאור האירוע",
              style: eventDetailTextStyle,
            ),
            SizedBox(
              height: 5.0,
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(15.0),
              child: Container(
                  color: lightTheme,
                  child: TextFormField(
                    keyboardType: TextInputType.multiline,
                    maxLines: null,
                    style: eventDetailTextStyle.copyWith(color: Colors.black),
                    textAlign: TextAlign.right,
                    textDirection: TextDirection.rtl,
                    autocorrect: false,
                    //maxLength: 500,
                    decoration: InputDecoration(
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 16.0, vertical: 16),
                      border: InputBorder.none,
                    ),
                  )),
            ),
            SizedBox(
              height: 10.0,
            ),
            Text(
              "בחר קטגוריה",
              style: eventDetailTextStyle,
            ),
            SizedBox(
              height: 5.0,
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(15.0),
              child: Container(
                color: lightTheme,
                child: SearchableDropdown.single(
                  style: eventDetailTextStyle,
                  displayClearIcon: false,
                  items: <String>['ארוחה', 'אירוע', 'מפגש', 'מסיבה']
                      .map<DropdownMenuItem<String>>((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Container(
                        child: Text(
                          value,
                          style: eventDetailTextStyle.copyWith(
                              color: Colors.black),
                        ),
                        //width: 200,
                        alignment: Alignment.centerRight,
                      ),
                    );
                  }).toList(),
                  value: selectedValue,
                  //hint: "בחר סוג אירוע",
                  searchHint: "בחר קטגוריה",
                  closeButton: "סגור",
                  //menuBackgroundColor: darkTheme,
                  onChanged: (value) {
                    setState(() {
                      selectedValue = value;
                    });
                  },
                  isExpanded: true,
                ),
              ),
            ),
            SizedBox(
              height: 5.0,
            ),
            Text(
              "בחר תאריך וזמן",
              style: eventDetailTextStyle,
            ),
            SizedBox(
              height: 5.0,
            ),
            SizedBox(
              height: 5.0,
            ),
            ClipRRect(
                borderRadius: BorderRadius.circular(15.0),
                child:
                    Container(color: lightTheme, child: BasicDateTimeField())),
            // SizedBox(
            //   height: 5.0,
            // ),
          ],
        ),
      )),
    );
  }
}

class BasicDateTimeField extends StatelessWidget {
  final format = DateFormat("HH:mm dd-MM-yyyy");
  @override
  Widget build(BuildContext context) {
    return Column(children: <Widget>[
      //Text('Basic date & time field (${format.pattern})'),
      DateTimeField(
        style: eventDetailTextStyle.copyWith(color: Colors.black),
        textAlign: TextAlign.right,
        textDirection: TextDirection.rtl,
        decoration: InputDecoration(
          contentPadding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 16),
          border: InputBorder.none,
        ),
        format: format,
        onShowPicker: (context, currentValue) async {
          final date = await showDatePicker(
              context: context,
              builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(alwaysUse24HourFormat: true),
                  child: child),
              firstDate: DateTime.now(),
              initialDate: currentValue ?? DateTime.now(),
              textDirection: TextDirection.rtl,
              lastDate: DateTime(2100));
          if (date != null) {
            final time = await showTimePicker(
              context: context,
              initialTime:
                  TimeOfDay.fromDateTime(currentValue ?? DateTime.now()),
            );
            return DateTimeField.combine(date, time);
          } else {
            return currentValue;
          }
        },
      ),
    ]);
  }
}

class AllFieldsFormBloc extends FormBloc<String, String> {
  final title = TextFieldBloc();
  final desc = TextFieldBloc();
  final link = TextFieldBloc();

  final boolean1 = BooleanFieldBloc();

  final boolean2 = BooleanFieldBloc();

  final category = SelectFieldBloc(
    items: ['מסיבה', 'יום הולדת', 'ארוחה', 'מפגש', 'חתונה'],
  );

  final select2 = SelectFieldBloc(
    items: ['Option 1', 'Option 2'],
  );

  final multiSelect1 = MultiSelectFieldBloc<String, dynamic>(
    items: [
      'Option 1',
      'Option 2',
    ],
  );

  final date1 = InputFieldBloc<DateTime, Object>();

  final dateAndTime1 = InputFieldBloc<DateTime, Object>();

  final time1 = InputFieldBloc<TimeOfDay, Object>();

  AllFieldsFormBloc() {
    addFieldBlocs(fieldBlocs: [
      title,
      boolean1,
      boolean2,
      category,
      select2,
      multiSelect1,
      date1,
      dateAndTime1,
      time1,
    ]);
  }

  @override
  void onSubmitting() async {
    try {
      await Future<void>.delayed(Duration(milliseconds: 500));

      emitSuccess(canSubmitAgain: true);
    } catch (e) {
      emitFailure();
    }
  }
}

class AddEventPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => AllFieldsFormBloc(),
      child: Builder(
        builder: (context) {
          final formBloc = BlocProvider.of<AllFieldsFormBloc>(context);

          return Theme(
            data: Theme.of(context).copyWith(
              inputDecorationTheme: InputDecorationTheme(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            ),
            child: Scaffold(
              appBar: AppBar(title: Text('צור אירוע חדש')),
              body: FormBlocListener<AllFieldsFormBloc, String, String>(
                onSubmitting: (context, state) {
                  LoadingDialog.show(context);
                },
                onSuccess: (context, state) {
                  LoadingDialog.hide(context);

                  Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => SuccessScreen()));
                },
                onFailure: (context, state) {
                  LoadingDialog.hide(context);

                  Scaffold.of(context).showSnackBar(
                      SnackBar(content: Text(state.failureResponse)));
                },
                child: Container(
                  //color: lightTheme.withOpacity(0.7),
                  child: SingleChildScrollView(
                    physics: ClampingScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(
                        children: <Widget>[
                          TextFieldBlocBuilder(
                            textFieldBloc: formBloc.link,
                            maxLength: 200,
                            decoration: InputDecoration(
                              labelText: "לינק לאירוע",
                              prefixIcon: Icon(Icons.link),
                            ),
                          ),
                          TextFieldBlocBuilder(
                            maxLines: null,
                            keyboardType: TextInputType.multiline,
                            textFieldBloc: formBloc.title,
                            maxLength: 50,
                            decoration: InputDecoration(
                              labelText: "שם האירוע",
                              prefixIcon: Icon(Icons.title),
                            ),
                          ),

                          DropdownFieldBlocBuilder<String>(
                            selectFieldBloc: formBloc.category,
                            decoration: InputDecoration(
                              labelText: 'קטגוריה',
                              prefixIcon: Icon(Icons.category),
                            ),
                            itemBuilder: (context, value) => value,
                          ),

                          TextFieldBlocBuilder(
                            maxLines: null,
                            keyboardType: TextInputType.multiline,
                            textFieldBloc: formBloc.desc,
                            maxLength: 250,
                            decoration: InputDecoration(
                              labelText: "תיאור האירוע",
                              prefixIcon: Icon(Icons.description),
                            ),
                          ),

                          DateTimeFieldBlocBuilder(
                            dateTimeFieldBloc: formBloc.dateAndTime1,
                            canSelectTime: true,
                            format: DateFormat('dd-MM-yyyy  hh:mm'),
                            initialDate: DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime(2100),
                            decoration: InputDecoration(
                              labelText: 'תאריך ושעה',
                              prefixIcon: Icon(Icons.date_range),
                            ),
                          ),

                          // RadioButtonGroupFieldBlocBuilder<String>(
                          //   selectFieldBloc: formBloc.select2,
                          //   decoration: InputDecoration(
                          //     labelText: 'RadioButtonGroupFieldBlocBuilder',
                          //     suffixIcon: SizedBox(),
                          //   ),
                          //   itemBuilder: (context, item) => item,
                          // ),
                          // CheckboxGroupFieldBlocBuilder<String>(
                          //   multiSelectFieldBloc: formBloc.multiSelect1,
                          //   itemBuilder: (context, item) => item,
                          //   decoration: InputDecoration(
                          //     labelText: 'CheckboxGroupFieldBlocBuilder',
                          //     suffixIcon: SizedBox(),
                          //   ),
                          // ),
                          // DateTimeFieldBlocBuilder(
                          //   dateTimeFieldBloc: formBloc.date1,
                          //   format: DateFormat('dd-mm-yyyy'),
                          //   initialDate: DateTime.now(),
                          //   firstDate: DateTime(1900),
                          //   lastDate: DateTime(2100),
                          //   decoration: InputDecoration(
                          //     labelText: 'DateTimeFieldBlocBuilder',
                          //     suffixIcon: Icon(Icons.calendar_today),
                          //     helperText: 'Date',
                          //   ),
                          // ),
                          // TimeFieldBlocBuilder(
                          //   timeFieldBloc: formBloc.time1,
                          //   format: DateFormat('hh:mm a'),
                          //   initialTime: TimeOfDay.now(),
                          //   decoration: InputDecoration(
                          //     labelText: 'TimeFieldBlocBuilder',
                          //     suffixIcon: Icon(Icons.access_time),
                          //   ),
                          // ),
                          // SwitchFieldBlocBuilder(
                          //   booleanFieldBloc: formBloc.boolean2,
                          //   body: Container(
                          //     alignment: Alignment.centerRight,
                          //     child: Text('CheckboxFieldBlocBuilder'),
                          //   ),
                          // ),
                          // CheckboxFieldBlocBuilder(
                          //   booleanFieldBloc: formBloc.boolean1,
                          //   body: Container(
                          //     alignment: Alignment.centerRight,
                          //     child: Text('לשלוח הזמנות לאירוע'),
                          //   ),
                          // ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class LoadingDialog extends StatelessWidget {
  static void show(BuildContext context, {Key key}) => showDialog<void>(
        context: context,
        useRootNavigator: false,
        barrierDismissible: false,
        builder: (_) => LoadingDialog(key: key),
      ).then((_) => FocusScope.of(context).requestFocus(FocusNode()));

  static void hide(BuildContext context) => Navigator.pop(context);

  LoadingDialog({Key key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false,
      child: Center(
        child: Card(
          child: Container(
            width: 80,
            height: 80,
            padding: EdgeInsets.all(12.0),
            child: CircularProgressIndicator(),
          ),
        ),
      ),
    );
  }
}

class SuccessScreen extends StatelessWidget {
  SuccessScreen({Key key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(Icons.tag_faces, size: 100),
            SizedBox(height: 10),
            Text(
              'Success',
              style: TextStyle(fontSize: 54, color: Colors.black),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 10),
            RaisedButton.icon(
              onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => AddEventPage())),
              icon: Icon(Icons.replay),
              label: Text('AGAIN'),
            ),
          ],
        ),
      ),
    );
  }
}
