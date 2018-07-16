// @flow

import * as React from 'react';
import {
  ActivityIndicator,
  AsyncStorage,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
// import { Font, Permissions } from 'expo';
import store from './store';
import { setUpDefault } from './actions/setUpDefault';

type Props = {
  navigation: { navigate: Function },
};

export default class AppBootstrap extends React.Component<Props> {
  componentDidMount() {
    this.bootstrapAsync();
  }

  // Fetch the token from storage then navigate to our appropriate place
  bootstrapAsync = async () => {
    // bootstrap the application
    // async storage key 'userData' : {
    // publicKey: Array<number>,
    // secretKey: Array<number>,
    // nameornym: String,
    // avatarUri: String
    // }
    try {
      // load user data
      let userData = await AsyncStorage.getItem('userData');
      if (userData !== null) {
        userData = JSON.parse(userData);

        store.dispatch(setUpDefault(userData));
      } else {
        store.dispatch(setUpDefault({}));
      }

      // once everything is set up
      this.props.navigation.navigate(userData ? 'App' : 'Onboarding');
    } catch (err) {
      console.warn(err);
    }
  };

  // Render any loading content that you like here
  render() {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar barStyle="default" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});