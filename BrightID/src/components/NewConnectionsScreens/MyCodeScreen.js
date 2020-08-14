// @flow

import React, {
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Clipboard,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import { path } from 'ramda';
import Spinner from 'react-native-spinkit';
import Material from 'react-native-vector-icons/MaterialCommunityIcons';
import GroupSwitch from '@/components/Helpers/GroupSwitch';
import { DEVICE_LARGE, ORANGE, DEVICE_IOS } from '@/utils/constants';
import { qrCodeToSvg } from '@/utils/qrCodes';
import { useInterval } from '@/utils/hooks';
import cameraIcon from '@/static/camera_icon_white.svg';
import {
  channel_states,
  channel_types,
  selectChannelById,
  closeChannel,
  setDisplayChannelType,
} from '@/components/NewConnectionsScreens/channelSlice';
import { encodeChannelQrString } from '@/utils/channels';
import { selectAllPendingConnectionsByChannel } from '@/components/NewConnectionsScreens/pendingConnectionSlice';
import { createFakeConnection } from '@/components/Connections/models/createFakeConnection';
import { createChannel } from '@/components/NewConnectionsScreens/actions/channelThunks';

/**
 * My Code screen of BrightID
 *
 * USERA represents this user
 * ==================================================================
 * displays a qrcode
 *
 */

const Container = DEVICE_IOS ? SafeAreaView : View;

const Timer = () => {
  const navigation = useNavigation();
  const myChannel = useSelector((state) => {
    const { myChannelIds, displayChannelType } = state.channels;
    return selectChannelById(state, myChannelIds[displayChannelType]);
  });
  const [countdown, setCountdown] = useState(
    myChannel ? myChannel.ttl - (Date.now() - myChannel.timestamp) : 0,
  );

  const timerTick = () => {
    if (myChannel && navigation.isFocused()) {
      let countDown = myChannel.ttl - (Date.now() - myChannel.timestamp);
      setCountdown(countDown);
    }
  };

  // start local timer to display countdown
  useInterval(timerTick, 100);
  const displayTime = () => {
    const minutes = Math.floor(countdown / 60000);
    let seconds = Math.trunc((countdown % 60000) / 1000);
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    return `${minutes}:${seconds}`;
  };

  return countdown > 0 ? (
    <View style={styles.timerContainer}>
      <Text style={styles.timerTextLeft}>Expires in: </Text>
      <Text style={styles.timerTextRight}>{displayTime()}</Text>
    </View>
  ) : (
    <View style={[styles.timerContainer, { height: 20 }]} />
  );
};

export const MyCodeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const displayChannelType = useSelector(
    (state) => state.channels.displayChannelType,
  );
  const myChannel = useSelector((state) =>
    selectChannelById(state, state.channels.myChannelIds[displayChannelType]),
  );

  const myName = useSelector((state) => state.user.name);
  // pending connections attached to my channel
  const pendingConnectionSizeForChannel = useSelector((state) => {
    return selectAllPendingConnectionsByChannel(state, myChannel)?.length;
  });

  const [qrString, setQrString] = useState('');
  const [qrsvg, setQrsvg] = useState('');

  // create QRCode from channel data
  useEffect(() => {
    if (myChannel && myChannel.state === channel_states.OPEN) {
      console.log(
        `Creating QRCode: profileId ${myChannel.myProfileId} channel ${myChannel.id}`,
      );
      const newQrString = encodeChannelQrString(myChannel);
      setQrString(newQrString);
      qrCodeToSvg(newQrString, (qrsvg) => setQrsvg(qrsvg));
    } else {
      setQrString('');
      setQrsvg('');
    }
  }, [myChannel]);

  // set up top right button in header
  useLayoutEffect(() => {
    if (__DEV__ && myChannel?.state === channel_states.OPEN) {
      // $FlowFixMe
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            testID="fakeConnectionBtn"
            style={{ marginRight: 11 }}
            onPress={createFakeConnection}
          >
            <Material name="ghost" size={32} color="#fff" />
          </TouchableOpacity>
        ),
      });
    }
  }, [myChannel, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!navigation.isFocused()) return;
      if (!myChannel) {
        dispatch(createChannel(displayChannelType));
      }
    }, [navigation, myChannel, dispatch, displayChannelType]),
  );

  useEffect(() => {
    if (displayChannelType === channel_types.SINGLE) {
      // If i created a 1:1 channel and there is a pending connection in UNCONFIRMED state -> directly open PendingonnectionScreen.
      // there should be only one connection

      if (pendingConnectionSizeForChannel > 0) {
        navigation.navigate('PendingConnections');
        dispatch(closeChannel(myChannel?.id));
      }
    }
  }, [
    displayChannelType,
    navigation,
    pendingConnectionSizeForChannel,
    dispatch,
    myChannel,
  ]);

  const toggleGroup = () => {
    // toggle switch
    dispatch(
      setDisplayChannelType(
        displayChannelType === channel_types.SINGLE
          ? channel_types.GROUP
          : channel_types.SINGLE,
      ),
    );
  };

  const copyQr = () => {
    const universalLink = `https://app.brightid.org/connection-code/${qrString}`;
    Clipboard.setString(universalLink);
    Alert.alert(
      'Universal Link',
      `We've copied a url to your clipboard that can be shared with friends who have BrightID installed on their device. Please do not close this app process until they have sent you a request.`,
    );
  };

  const CopyQr = () => (
    <View style={styles.copyContainer}>
      <TouchableOpacity
        testID="copyQrButton"
        style={styles.copyButton}
        onPress={copyQr}
      >
        <Material
          size={24}
          name="content-copy"
          color="#333"
          style={{ width: 24, height: 24 }}
        />
        <Text style={styles.copyText}> Copy Link</Text>
      </TouchableOpacity>
    </View>
  );

  const displayOneToOneInfo = () => {
    Alert.alert(
      'One to One',
      `This QR code can be used to connect with a single user before it expires. We will automatically generate a new code for you after you make a connection or press 'Copy Link'`,
    );
  };

  const displayManyToManyInfo = () => {
    Alert.alert(
      'Many to Many',
      'This QR code is designed for group connections. Everyone who scans this code will be prompted to connect with everyone else who scaned this code before the time expires. ',
    );
  };

  const renderSpinner = () => (
    <Spinner
      // style={styles.spinner}
      isVisible={true}
      size={47}
      type="9CubeGrid"
      color="#4990e2"
    />
  );

  const QrCode = useMemo(() => {
    return (
      <Svg
        height={DEVICE_LARGE ? '260' : '200'}
        width={DEVICE_LARGE ? '260' : '200'}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={path(['svg', '$', 'viewBox'], qrsvg)}
        shape-rendering="crispEdges"
      >
        <Path fill="#fff" d={path(['svg', 'path', '0', '$', 'd'], qrsvg)} />
        <Path stroke="#000" d={path(['svg', 'path', '1', '$', 'd'], qrsvg)} />
      </Svg>
    );
  }, [qrsvg]);

  console.log('rendering My QRCode');

  return (
    <>
      <View style={styles.orangeTop} />
      <Container style={styles.container}>
        <GroupSwitch
          onValueChange={toggleGroup}
          value={displayChannelType === channel_types.SINGLE}
        />
        <View style={styles.infoTopContainer}>
          <Text style={styles.infoTopText}>Connection Type: </Text>
          {displayChannelType === channel_types.GROUP ? (
            <TouchableOpacity
              style={{ flexDirection: 'row' }}
              onPress={displayManyToManyInfo}
            >
              <Text style={styles.infoTopText}>Many to Many </Text>
              <Material name="information-variant" size={18} color="#4a4a4a" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ flexDirection: 'row' }}
              onPress={displayOneToOneInfo}
            >
              <Text style={styles.infoTopText}>One to One </Text>
              <Material name="information-variant" size={18} color="4a4a4a" />
            </TouchableOpacity>
          )}
        </View>
        {myChannel && myChannel.state === channel_states.OPEN ? (
          <View style={styles.qrCodeContainer} testID="QRCodeContainer">
            {qrsvg ? <Timer /> : <View />}
            {qrsvg ? QrCode : renderSpinner()}
            {qrsvg ? <CopyQr /> : <View />}
          </View>
        ) : (
          <View style={styles.qrCodeContainer} testID="QRCodeContainer">
            <View style={styles.emptyQr}>
              <Spinner
                // style={styles.spinner}
                isVisible={true}
                size={47}
                type="FadingCircle"
                color="#333"
              />
            </View>
          </View>
        )}
        <View style={styles.bottomContainer}>
          {pendingConnectionSizeForChannel < 1 ? (
            <>
              <Text style={styles.infoBottomText}>Or you can also...</Text>
              <TouchableOpacity
                testID="MyCodeToScanCodeBtn"
                style={styles.scanCodeButton}
                onPress={() => {
                  navigation.navigate('ScanCode');
                }}
              >
                <SvgXml
                  xml={cameraIcon}
                  width={DEVICE_LARGE ? 22 : 20}
                  height={DEVICE_LARGE ? 22 : 20}
                />
                <Text style={styles.scanCodeText}>Scan a Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.infoBottomText}>
                You have {pendingConnectionSizeForChannel} pending connection
                {pendingConnectionSizeForChannel > 1 ? 's' : ''}...
              </Text>
              <TouchableOpacity
                testID="MyCodeToPendingConnections"
                style={styles.verifyConnectionsButton}
                onPress={() => {
                  navigation.navigate('PendingConnections');
                }}
              >
                <Material
                  name="account-multiple-plus-outline"
                  size={DEVICE_LARGE ? 32 : 26}
                  color={ORANGE}
                />
                <Text style={styles.verifyConnectionsText}>
                  Verify Connections
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Container>
    </>
  );
};

const styles = StyleSheet.create({
  orangeTop: {
    backgroundColor: ORANGE,
    height: 70,
    width: '100%',
    zIndex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column',
    borderTopLeftRadius: 58,
    borderTopRightRadius: 58,
    marginTop: -58,
    zIndex: 10,
  },
  infoTopContainer: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: DEVICE_LARGE ? 50 : 20,
    paddingRight: DEVICE_LARGE ? 50 : 20,
    paddingTop: DEVICE_LARGE ? 20 : 10,
  },
  infoTopText: {
    fontFamily: 'Poppins',
    fontWeight: '500',
    fontSize: DEVICE_LARGE ? 14 : 12,
    textAlign: 'center',
    color: '#4a4a4a',
  },
  qrCodeContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 2,
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: DEVICE_LARGE ? 260 : 200,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyText: {
    color: '#333',
    fontFamily: 'Poppins',
    fontWeight: '500',
    fontSize: DEVICE_LARGE ? 14 : 12,
  },
  timerContainer: {
    flexDirection: 'row',
  },
  timerTextLeft: {
    fontFamily: 'Poppins',
    fontWeight: '500',
    fontSize: DEVICE_LARGE ? 16 : 14,
  },
  timerTextRight: {
    fontFamily: 'Poppins',
    fontWeight: '500',
    fontSize: DEVICE_LARGE ? 16 : 14,
  },
  bottomContainer: {
    alignItems: 'center',
    minHeight: 100,
  },
  infoBottomText: {
    fontFamily: 'Poppins',
    fontWeight: '500',
    fontSize: DEVICE_LARGE ? 12 : 11,
    marginBottom: 10,
  },
  scanCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: DEVICE_LARGE ? 42 : 36,
    backgroundColor: ORANGE,
    borderRadius: 60,
    width: DEVICE_LARGE ? 240 : 200,
    marginBottom: 10,
  },
  scanCodeText: {
    fontFamily: 'Poppins',
    fontWeight: 'bold',
    fontSize: DEVICE_LARGE ? 14 : 12,
    color: '#fff',
    marginLeft: 10,
  },
  verifyConnectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: DEVICE_LARGE ? 42 : 36,
    backgroundColor: '#fff',
    borderRadius: 60,
    width: DEVICE_LARGE ? 240 : 200,
    marginBottom: 36,
    borderWidth: 2,
    borderColor: ORANGE,
  },
  verifyConnectionsText: {
    fontFamily: 'Poppins',
    fontWeight: 'bold',
    fontSize: DEVICE_LARGE ? 14 : 12,
    color: ORANGE,
    marginLeft: 10,
  },
  emptyQr: {
    justifyContent: 'center',
    alignItems: 'center',
    height: DEVICE_LARGE ? 308 : 244,
  },
});

export default MyCodeScreen;
