// @flow

import { createCipher } from 'react-native-crypto';
import nacl from 'tweetnacl';
import { postData } from './postData';
import { retrievePhoto } from '../../../utils/filesystem';
import { strToUint8Array, uInt8ArrayToB64 } from '../../../utils/encoding';

export const encryptAndUploadLocalData = () => async (dispatch, getState) => {
  const {
    publicKey,
    secretKey,
    photo: { filename },
    name,
    connectQrData: { aesKey },
    score,
    connectUserData,
  } = getState().main;

  // retrieve photo
  const photo = await retrievePhoto(filename);

  let timestamp;
  let signedMessage;

  if (connectUserData.publicKey && !connectUserData.signedMessage) {
    // The other user sent their publicKey. Sign the message and send it.

    timestamp = Date.now();
    const message =
      publicKey + connectUserData.publicKey + timestamp;
    signedMessage = uInt8ArrayToB64(
      nacl.sign.detached(strToUint8Array(message), secretKey),
    );
  }

  const dataObj = {
    publicKey,
    photo,
    name,
    score,
    signedMessage,
    timestamp,
  };

  const dataStr = JSON.stringify(dataObj);

  const cipher = createCipher('aes128', aesKey);

  let encrypted =
    cipher.update(dataStr, 'utf8', 'base64') + cipher.final('base64');
  console.log('encrypting data');
  dispatch(postData(encrypted));
};
