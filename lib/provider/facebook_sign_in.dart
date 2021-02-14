import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_login_facebook/flutter_login_facebook.dart';

class FacebookSignInProvider extends ChangeNotifier {
  final facebookSignIn = FacebookLogin(debug: true);
  bool _isSigningIn;
  var _user;

  FacebookSignInProvider() {
    _isSigningIn = false;
  }

  bool get isSigningIn => _isSigningIn;

  set isSigningIn(bool isSigningIn) {
    _isSigningIn = isSigningIn;
    notifyListeners();
  }

  Future login() async {
    isSigningIn = true;
    logout();
    _user = await facebookSignIn.logIn(permissions: [
      FacebookPermission.publicProfile,
      FacebookPermission.email
    ]);

    switch (_user.status) {
      case FacebookLoginStatus.success:
        final FacebookAccessToken fbToken = _user.accessToken;
        final credential = FacebookAuthProvider.credential(fbToken.token);
        await FirebaseAuth.instance.signInWithCredential(credential);
        isSigningIn = false;
        break;
      case FacebookLoginStatus.cancel:
        print("the user canceled the login");
        isSigningIn = false;
        break;
      case FacebookLoginStatus.error:
        print("error login in to facebook");
        isSigningIn = false;
        break;
    }
  }

  void logout() async {
    await facebookSignIn.logOut();
    await FirebaseAuth.instance.signOut();
    _user = null;
  }
}
