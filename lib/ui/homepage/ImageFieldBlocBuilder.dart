import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_form_bloc/flutter_form_bloc.dart';
import 'package:image_picker/image_picker.dart';

class ImageFieldBlocBuilder extends StatelessWidget {
  final InputFieldBloc<File, Object> fileFieldBloc;
  final FormBloc formBloc;
  const ImageFieldBlocBuilder({
    Key key,
    @required this.fileFieldBloc,
    @required this.formBloc,
  })  : assert(fileFieldBloc != null),
        assert(formBloc != null),
        super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InputFieldBloc<File, Object>,
        InputFieldBlocState<File, Object>>(
      bloc: fileFieldBloc,
      builder: (context, fieldBlocState) {
        return BlocBuilder<FormBloc, FormBlocState>(
          bloc: formBloc,
          builder: (context, formBlocState) {
            return Column(
              children: <Widget>[
                Stack(
                  children: <Widget>[
                    Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(color: Colors.grey, width: 1),
                      ),
                      margin: EdgeInsets.zero,
                      clipBehavior: Clip.antiAlias,
                      elevation: 0,
                      color: fieldBlocState.value != null
                          ? Colors.grey[700]
                          : Colors.white,
                      child: Opacity(
                        opacity: formBlocState.canSubmit ? 1 : 0.5,
                        child: fieldBlocState.value != null
                            ? Image.file(
                                fieldBlocState.value,
                                height: 150,
                                width: 200,
                                fit: BoxFit.cover,
                              )
                            : Container(
                                height: 150,
                                width: 200,
                                child: Icon(
                                  Icons.add_photo_alternate,
                                  color: Colors.black87,
                                  size: 70,
                                ),
                              ),
                      ),
                    ),
                    Positioned.fill(
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          splashColor:
                              Theme.of(context).accentColor.withAlpha(50),
                          highlightColor:
                              Theme.of(context).accentColor.withAlpha(50),
                          borderRadius: BorderRadius.circular(20),
                          onTap: formBlocState.canSubmit
                              ? () async {
                                  final image = await ImagePicker.pickImage(
                                    source: ImageSource.gallery,
                                  );
                                  if (image != null) {
                                    fileFieldBloc.updateValue(image);
                                  }
                                }
                              : null,
                        ),
                      ),
                    ),
                  ],
                ),
                AnimatedContainer(
                  duration: Duration(milliseconds: 300),
                  height: fieldBlocState.canShowError ? 30 : 0,
                  child: SingleChildScrollView(
                    physics: ClampingScrollPhysics(),
                    child: Column(
                      children: <Widget>[
                        SizedBox(height: 8),
                        Text(
                          fieldBlocState?.error ?? '',
                          style: TextStyle(
                            color: Theme.of(context).errorColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class MyFormBloc extends FormBloc<String, String> {
  final InputFieldBloc<File, Object> image = InputFieldBloc(
    validators: [
      _sizeValidator,
    ],
  );

  static String _sizeValidator(File file) {
    if (file != null && file.lengthSync() > 1000) {
      return 'Max size 1000 bytes';
    }
    return null;
  }

  @override
  void onSubmitting() {
    // TODO: implement onSubmitting
  }
}
