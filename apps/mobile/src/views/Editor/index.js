import React, {useEffect, useState} from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
  ActivityIndicator,
  Text,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/Feather';
import WebView from 'react-native-webview';
import {db, DDS} from '../../../App';
import {SIZE, WEIGHT} from '../../common/common';
import {
  ActionSheetEvent,
  simpleDialogEvent,
  TEMPLATE_EXIT,
  _recieveEvent,
  _unSubscribeEvent,
  TEMPLATE_EXIT_FULLSCREEN,
} from '../../components/DialogManager';
import {useTracked, ACTIONS} from '../../provider';
import {SideMenuEvent, w, h} from '../../utils/utils';
import {AnimatedSafeAreaView} from '../Home';

let EditorWebView;
let note = {};
let timestamp = null;
var content = null;
var title = null;
let timer = null;
let saveCounter = 0;
const Editor = ({navigation, noMenu}) => {
  // Global State
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const [loading, setLoading] = useState(true);

  let fullscreen = false;

  // FUNCTIONS

  const post = value => EditorWebView.postMessage(value);
  useEffect(() => {
    _recieveEvent('loadNoteEvent', loadNote);

    return () => {
      _unSubscribeEvent('loadNoteEvent', loadNote);
    };
  }, []);

  const loadNote = item => {
    if (note && note.dateCreated) {
      saveNote(true).then(() => {
        dispatch({type: ACTIONS.NOTES});
        if (item && item.type === 'new') {
          clearEditor();
        } else {
          note = item;
          dispatch({
            type: ACTIONS.CURRENT_EDITING_NOTE,
            dateCreated: item.dateCreated,
          });
          updateEditor();
        }
      });
    } else {
      dispatch({type: ACTIONS.NOTES});
      if (item && item.type === 'new') {
        clearEditor();
      } else {
        note = item;
        dispatch({
          type: ACTIONS.CURRENT_EDITING_NOTE,
          dateCreated: item.dateCreated,
        });
        updateEditor();
      }
    }
  };

  const clearEditor = () => {
    timestamp = null;
    title = null;
    content = null;
    note = {};
    saveCounter = 0;

    post('clear');
    post(
      JSON.stringify({
        type: 'title',
        value: null,
      }),
    );
    post('focusTitle');
  };

  const onChange = data => {
    if (data !== '') {
      let rawData = JSON.parse(data);
      if (rawData.type === 'content') {
        content = rawData;
      } else {
        title = rawData.value;
      }
    }
  };

  const _onMessage = evt => {
    if (evt.nativeEvent.data === 'loaded') {
      setLoading(false);
    } else if (
      evt.nativeEvent.data !== '' &&
      evt.nativeEvent.data !== 'loaded'
    ) {
      clearTimeout(timer);
      timer = null;
      onChange(evt.nativeEvent.data);
      timer = setTimeout(() => {
        saveNote.call(this, true);
      }, 1000);
    }
  };

  const _onShouldStartLoadWithRequest = request => {
    if (request.url.includes('https')) {
      Linking.openURL(request.url);
      return false;
    } else {
      return true;
    }
  };

  const saveNote = async (lockNote = true) => {
    if (!title && !content) return;
    if (title === '' && content.text === '') return;

    if (!content) {
      content = {
        text: '',
        delta: null,
      };
    }

    let dateCreated = await db.addNote({
      title,
      content: {
        text: content.text,
        delta: content.delta,
      },
      dateCreated: timestamp,
    });

    if (timestamp !== dateCreated) {
      timestamp = dateCreated;
      dispatch({type: ACTIONS.CURRENT_EDITING_NOTE, dateCreated: timestamp});
    }

    if (content.text.length < 200 || saveCounter < 2) {
      dispatch({
        type: ACTIONS.NOTES,
      });
    }
    saveCounter++;
    if (timestamp) {
      let lockednote = db.getNote(timestamp);
      if (lockNote && lockednote.locked) {
        await db.lockNote(timestamp, 'password');
      }
    }
  };

  const onWebViewLoad = () => {
    console.log('requesting focus');
    EditorWebView.requestFocus();
    if (noMenu) {
      post(
        JSON.stringify({
          type: 'nomenu',
          value: true,
        }),
      );
    } else {
      post(
        JSON.stringify({
          type: 'nomenu',
          value: false,
        }),
      );
    }

    if (navigation && navigation.state.params && navigation.state.params.note) {
      note = navigation.state.params.note;
      updateEditor();
    } else if (note && note.dateCreated) {
      updateEditor();
    } else {
      post('focusTitle');
      wait(500).then(() => {
        setLoading(false);
      });
    }

    post(JSON.stringify(colors));
  };

  const wait = timeout =>
    new Promise((resolve, reject) => {
      if (!timeout || typeof timeout !== 'number') reject();
      setTimeout(() => {
        resolve();
      }, timeout);
    });

  const updateEditor = () => {
    title = note.title;
    timestamp = note.dateCreated;
    content = note.content;
    saveCounter = 0;

    if (title !== null || title === '') {
      post(
        JSON.stringify({
          type: 'title',
          value: note.title,
        }),
      );
    } else {
      post('focusTitle');
      post('clear');
    }
    if (note.content.text === '' || note.content.delta === null) {
      post('clear');
    } else {
      post(JSON.stringify(note.content.delta));
    }
  };

  const params = 'platform=' + Platform.OS;

  const sourceUri =
    (Platform.OS === 'android' ? 'file:///android_asset/' : '') +
    'Web.bundle/loader.html';
  const injectedJS = `if (!window.location.search) {
      var link = document.getElementById('progress-bar');
      link.href = './site/index.html?${params}';
      link.click();
    }`;

  const _renderEditor = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: 'transparent',
        }}>
        <View
          style={{
            marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
          }}
        />

        <Animatable.View
          transition={['translateY']}
          useNativeDriver={true}
          duration={3000}
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            position: 'absolute',
            backgroundColor: colors.bg,
            transform: [
              {
                translateY: loading ? 0 : -h * 1.5,
              },
            ],
          }}>
          {loading ? (
            <ActivityIndicator color={colors.accent} size={SIZE.xxxl} />
          ) : null}

          <Text
            style={{
              color: colors.accent,
              fontFamily: WEIGHT.regular,
              fontSize: SIZE.md,
              marginTop: 10,
            }}>
            Write with confidence.
          </Text>
        </Animatable.View>

        {noMenu ? null : (
          <TouchableOpacity
            onPress={() => {
              DDS.isTab
                ? simpleDialogEvent(TEMPLATE_EXIT_FULLSCREEN())
                : simpleDialogEvent(TEMPLATE_EXIT('Editor'));
            }}
            style={{
              width: 60,
              height: 50,
              justifyContent: 'center',
              alignItems: 'flex-start',
              position: 'absolute',
              left: 0,
              top: 0,
              marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
              paddingLeft: 12,
              zIndex: 800,
            }}>
            <Icon
              style={{
                marginLeft: -7,
                marginTop: -3.5,
              }}
              name="chevron-left"
              color={colors.icon}
              size={SIZE.xxxl - 3}
            />
          </TouchableOpacity>
        )}

        <View
          style={{
            flexDirection: 'row',
            marginRight: 0,
            position: 'absolute',
            marginTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
            zIndex: 800,
            right: 0,
            top: 0,
          }}>
          {DDS.isTab ? (
            <TouchableOpacity
              onPress={() => {
                if (fullscreen) {
                  DeviceEventEmitter.emit('closeFullScreenEditor');
                  fullscreen = false;
                  post(
                    JSON.stringify({
                      type: 'nomenu',
                      value: true,
                    }),
                  );
                } else {
                  DeviceEventEmitter.emit('showFullScreenEditor');
                  fullscreen = true;
                  post(
                    JSON.stringify({
                      type: 'nomenu',
                      value: false,
                    }),
                  );
                }
              }}
              style={{
                width: 60,
                height: 50,
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingRight: 12,
                zIndex: 800,
              }}>
              <Icon name="square" color={colors.icon} size={SIZE.xxxl} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              ActionSheetEvent(
                note,
                true,
                true,
                ['Add to', 'Share', 'Export', 'Delete'],
                ['Dark Mode', 'Add to Vault', 'Pin', 'Favorite'],
              );
            }}
            style={{
              width: 60,
              height: 50,
              justifyContent: 'center',
              alignItems: 'flex-end',

              paddingRight: 12,
              zIndex: 800,
            }}>
            <Icon name="more-horizontal" color={colors.icon} size={SIZE.xxxl} />
          </TouchableOpacity>
        </View>

        <WebView
          ref={ref => (EditorWebView = ref)}
          onError={error => console.log(error)}
          onLoad={onWebViewLoad}
          javaScriptEnabled
          injectedJavaScript={Platform.OS === 'ios' ? injectedJS : null}
          onShouldStartLoadWithRequest={_onShouldStartLoadWithRequest}
          renderLoading={() => (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
              }}
            />
          )}
          cacheMode="LOAD_NO_CACHE"
          cacheEnabled={false}
          domStorageEnabled
          scrollEnabled={false}
          bounces={true}
          allowFileAccess={true}
          scalesPageToFit={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={'*'}
          source={
            Platform.OS === 'ios'
              ? sourceUri
              : {
                  uri: 'file:///android_asset/texteditor.html',
                  baseUrl: 'file:///android_asset/',
                }
          }
          style={{
            height: '100%',
            maxHeight: '100%',
            backgroundColor: 'transparent',
          }}
          onMessage={_onMessage}
        />
      </KeyboardAvoidingView>
    );
  };

  // EFFECTS

  useEffect(() => {
    let handleBack;
    if (!noMenu) {
      handleBack = BackHandler.addEventListener('hardwareBackPress', () => {
        simpleDialogEvent(TEMPLATE_EXIT_FULLSCREEN());
        return true;
      });
    } else {
      if (handleBack) {
        handleBack.remove();
        handleBack = null;
      }
    }

    return () => {
      if (handleBack) {
        handleBack.remove();
        handleBack = null;
      }
      title = null;
      content = null;
      timer = null;
    };
  }, [noMenu]);

  useEffect(() => {
    noMenu ? null : SideMenuEvent.disable();

    return () => {
      if (noMenu) return;
      DDS.isTab ? SideMenuEvent.open() : null;
      SideMenuEvent.enable();
    };
  });

  useEffect(() => {
    EditorWebView.reload();
  }, [colors]);

  return (
    <AnimatedSafeAreaView
      transition={['backgroundColor', 'width']}
      duration={300}
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        height: '100%',
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
      {_renderEditor()}
    </AnimatedSafeAreaView>
  );
};

Editor.navigationOptions = {
  header: null,
  headerStyle: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    height: 0,
  },
};

export default Editor;
