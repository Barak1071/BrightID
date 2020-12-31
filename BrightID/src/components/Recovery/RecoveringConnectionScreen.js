// @flow

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import Spinner from 'react-native-spinkit';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import EmptyList from '@/components/Helpers/EmptyList';
import { ORANGE } from '@/utils/constants';
import { DEVICE_LARGE } from '@/utils/deviceConstants';
import { connectionsSelector } from '@/utils/connectionsSelector';
import api from '@/api/brightId';
import RecoveringConnectionCard from './RecoveringConnectionCard';

const ITEM_HEIGHT = DEVICE_LARGE ? 102 : 92;

const getItemLayout = (data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

const recoveryConnectionSelector = createSelector(
  connectionsSelector,
  (_, recoveryIds) => recoveryIds,
  (connections, recoveryIds) => {
    return connections.filter((conn) => recoveryIds.includes(conn.id));
  },
);

const RecoveringConnectionScreen = () => {
  const [recoveryIds, setRecoveryIds] = useState([]);

  const connections = useSelector((state) =>
    recoveryConnectionSelector(state, recoveryIds),
  );

  const id = useSelector((state) => state.user.id);

  const { t } = useTranslation();
  const route = useRoute();

  const [uploadingData, setUploadingData] = useState(false);
  const [loading, setLoading] = useState(false);

  const renderConnection = ({ item, index }) => {
    item.index = index;
    return (
      <RecoveringConnectionCard
        {...item}
        aesKey={route.params?.aesKey}
        setUploadingData={setUploadingData}
      />
    );
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.getConnections(id, 'inbound').then((connections) => {
        const recoveryIds = connections
          .filter((conn) => conn.level === 'recovery')
          .map((conn) => conn.id);
        setRecoveryIds(recoveryIds);
        setLoading(false);
      });
    }, [id]),
  );

  return (
    <>
      <View style={styles.orangeTop} />
      <View style={styles.container}>
        {!uploadingData ? (
          <View style={styles.mainContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.infoText}>
                {t('restore.text.chooseConnectionToHelp')}
              </Text>
            </View>
            <View style={styles.mainContainer}>
              <FlatList
                style={styles.connectionsContainer}
                contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
                data={connections}
                keyExtractor={({ id }, index) => id + index}
                renderItem={renderConnection}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <EmptyList
                    title={
                      loading
                        ? 'Downloading recovery connection data'
                        : 'Unable to recover any of your connections'
                    }
                  />
                }
                getItemLayout={getItemLayout}
              />
            </View>
          </View>
        ) : (
          <View style={styles.mainContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.infoText}>Uploading Shared Data</Text>
            </View>
            <Spinner size={DEVICE_LARGE ? 48 : 42} type="Wave" color={ORANGE} />
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  orangeTop: {
    backgroundColor: ORANGE,
    height: DEVICE_LARGE ? 70 : 65,
    width: '100%',
    zIndex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 58,
    marginTop: -58,
    zIndex: 10,
    overflow: 'hidden',
  },
  mainContainer: {
    marginTop: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'ApexNew-Book',
    fontSize: 20,
  },
  connectionsContainer: {
    flex: 1,
    width: '100%',
  },
  moreIcon: {
    marginRight: 16,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    backgroundColor: '#fff',
    width: '100%',
    marginBottom: 11,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    textAlign: 'center',
    width: '80%',
  },

  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#428BE5',
    width: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 13,
    paddingBottom: 12,
    marginTop: 9,
    marginBottom: 30,
  },
  buttonInnerText: {
    fontFamily: 'ApexNew-Medium',
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
});

export default RecoveringConnectionScreen;
