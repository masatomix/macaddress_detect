"use strict";

const me = this;

const config = require('config');
const moment = require('moment');
const request = require('request');
const logger = require('./logger');

const settings = config.settings;
const userInfo = config.userInfo;
const firebaseConfig = config.firebaseConfig;

const firebase = require('firebase/app')
require('firebase/firestore')
require('firebase/auth')
const firebaseApp = firebase.initializeApp(firebaseConfig)

module.exports.execute = async () => {
    logger.main.debug('MacAddressの検知を開始します...');
    const nic = settings.nic;
    console.log(`nic: ${nic}`)

    const buttons_config  = await me.getButtonConfig()

    const options = {};
    const other_options = {};
    for (let property in buttons_config) {
        const option = {
            url: 'https://hooks.slack.com/services' + buttons_config[property].bot_url,
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            json: {"text": buttons_config[property].message, "channel": buttons_config[property].channel}
        };
        options[property] = option;

        const other_option = {
            notify_flag :buttons_config[property].notify_flag
        };
        other_options[property] = other_option;

    }

    const MacAddresses = require('./node_modules/dash-button/build/MacAddresses.js');
    const Packets = require('./node_modules/dash-button/build/Packets.js');

    const pcap = require('pcap');
    const pcap_session = Packets.createCaptureSession(nic);


    const updateTimes = {};
    const updateTimesForUnknown = {};
    pcap_session.addListener('packet', (rawPacket) => {
        const packet = pcap.decode(rawPacket);
        const sourceMacAddress = MacAddresses.getEthernetSource(packet);
        let flag = false;

        const now = moment();
        for (let property in buttons_config) {
            if (buttons_config[property].mac_addresses.indexOf(sourceMacAddress) >= 0) {
                const nowStr = now.format("YYYY/MM/DD HH:mm:ss");

                console.log('登録されたMACアドレスが検出されました:[%s]: %s: %s', property, sourceMacAddress, nowStr);
                logger.main.info('登録されたMACアドレスが検出されました:[%s]: %s: %s', property, sourceMacAddress, nowStr);
                flag = true;


                const updateFlag = me.updateTimes(updateTimes, sourceMacAddress, now,10);

                if (updateFlag && other_options[property].notify_flag) {
                    request(options[property], function (error, response, body) {
                        if (!error) {
                            console.log(body);
                        }
                    });
                }
                break;
            }
        }
        if (!flag) { // 検出されたアドレスは登録にはなかった
            const now = moment();
            const nowStr = now.format("YYYY/MM/DD HH:mm:ss");
            console.log('登録されていないMACアドレスが検出されました: %s: %s', sourceMacAddress, nowStr);
            logger.main.info('登録されていないMACアドレスが検出されました: %s: %s', sourceMacAddress, nowStr);

            const updateFlag = me.updateTimes(updateTimesForUnknown, sourceMacAddress, now,30);
            if (updateFlag) {
                // const option = {
                //     url:
                //       'https://hooks.slack.com/services' +
                //       settings.unknown_url,
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     json: { text: `unknownなデバイスです:${sourceMacAddress}`, channel: '#other' },
                //   }
                //   request(option, function(error, response, body) {
                //     if (!error) {
                //       console.log(body)
                //     }
                //   })
                const optionEla = {
                    url:'http://192.168.10.200:9202/home_event/_doc',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    json:  {
                        "date": new Date(),
                        "action":  'unknownなデバイスを検知',
                        "macAddress":  sourceMacAddress
                        }
                  }
                  request(optionEla, function(error, response, body) {
                    if (!error) {
                      console.log(body)
                    }
                  })   
            }
        }
    });
};


// Macアドレスと更新時間のリストを更新するメソッド。Interval(10分) たってたら、更新時間リストを更新する。
// updateTimes 更新時間のリスト
// sourceMacAddress 変更対象のMacアドレス
// updateTime 更新時間
// interval 前回より xx 分間は、再度通知はしない
module.exports.updateTimes = (updateTimes, sourceMacAddress, updateTime,interval) => {

    // const interval = 10;

    // updateTimes リストに存在しない場合は、追加してtrueを返す
    // 存在する場合は、経過時間をみて、必要に応じて更新してtrueやfalseを返す。

    const lastTime = updateTimes[sourceMacAddress];
    const thisTime = updateTime;

    if (updateTimes[sourceMacAddress]) {
        console.log("%s はリストに存在したので、経過時間をチェック", sourceMacAddress);

        console.log("更新時刻 前回: %s", lastTime);
        console.log("更新時刻 今回: %s", thisTime);

        // interval を足した時刻が thisTime を越えたかどうかをチェック
        if (lastTime.clone().add(interval, 'minutes').isBefore(thisTime)) {
            console.log("%s はリストに存在したけど、経過時間が %s 分を過ぎているのでtrue", sourceMacAddress, interval);
            updateTimes[sourceMacAddress] = thisTime;
            console.log(JSON.stringify(updateTimes));
            return true;
        }

        console.log("%s はリストに存在して、経過時間が %s 分を過ぎていないのでfalse", sourceMacAddress, interval);
        // 更新しないのでFalse
        return false;
    } else {
        console.log("%s はリストに存在しないのでtrue", sourceMacAddress);

        updateTimes[sourceMacAddress] = thisTime;
        console.log(JSON.stringify(updateTimes));

        // 更新するのでTrue;
        return true;
    }
};

module.exports.getButtonConfig = async () => {
    const result = await firebase
      .auth()
      .signInWithEmailAndPassword(userInfo.userId, userInfo.password)
    const user = firebase.auth().currentUser
    // console.log(`displayName: ${user.displayName}`)
    // console.log(`email: ${user.email}`)
    // console.log(`emailVerified: ${user.emailVerified}`)
    // console.log(`uid: ${user.uid}`)

    let buttons ={}
  
    try {
      const db = firebaseApp.firestore()
      const snapshot = await db.collection('app_settings/macaddress_detect/buttons').get()
      snapshot.forEach(doc => {
          let property = doc.id
          let value = doc.data()
          buttons[property]= value
      })
      console.log('デバイス情報:')
      console.log(buttons)
    } catch (err) {
      console.log('Error getting documents', err)
    }
    return buttons
  }


if (!module.parent) {
    me.execute();
}
