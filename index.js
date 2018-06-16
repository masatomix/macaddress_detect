"use strict";

const me = this;

const config = require('config');
const moment = require('moment');
const request = require('request');
const logger = require('./logger');

const iot_config = config.iot;
const buttons_config = iot_config.buttons;


module.exports.execute = () => {
    logger.main.debug('MacAddressの検知を開始します...');
    const buttons = {};
    const options = {};
    for (let property in buttons_config) {
        const option = {
            url: 'https://hooks.slack.com/services' + buttons_config[property].bot_url,
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            json: {"text": buttons_config[property].message, "channel": buttons_config[property].channel}
        };
        // buttons[property] = button;
        options[property] = option;
    }

    const MacAddresses = require('./node_modules/dash-button/build/MacAddresses.js');
    const Packets = require('./node_modules/dash-button/build/Packets.js');

    const pcap = require('pcap');
    const interfacee = "wlan0";
    const pcap_session = Packets.createCaptureSession(interfacee);


    const updateTimes = {};
    pcap_session.addListener('packet', (rawPacket) => {
        const packet = pcap.decode(rawPacket);
        const sourceMacAddress = MacAddresses.getEthernetSource(packet);
        let flag = false;

        for (let property in buttons_config) {
            if (buttons_config[property].mac_addresses.indexOf(sourceMacAddress) >= 0) {
                const now = moment();
                const nowStr = now.format("YYYY/MM/DD HH:mm:ss");

                console.log('登録されたMACアドレスが検出されました:[%s]: %s: %s', property, sourceMacAddress, nowStr);
                logger.main.info('登録されたMACアドレスが検出されました:[%s]: %s: %s', property, sourceMacAddress, nowStr);
                flag = true;


                const updateFlag = me.updateTimes(updateTimes, sourceMacAddress, now);

                if (updateFlag) {
                    request(options[property], function (error, response, body) {
                        if (!error) {
                            console.log(body);
                        }
                    });
                }
                break;
            }
        }
        if (!flag) {
            const now = moment();
            const nowStr = now.format("YYYY/MM/DD HH:mm:ss");
            console.log('登録されていないMACアドレスが検出されました: %s: %s', sourceMacAddress, nowStr);
            logger.main.info('登録されていないMACアドレスが検出されました: %s: %s', sourceMacAddress, nowStr);
        }
    });
};


// Macアドレスと更新時間のリストを更新するメソッド。Interval(10分) たってたら、更新時間リストを更新する。
// updateTimes 更新時間のリスト
// sourceMacAddress 変更対象のMacアドレス
// updateTime 更新時間
module.exports.updateTimes = (updateTimes, sourceMacAddress, updateTime) => {

    const interval = 10;

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


if (!module.parent) {
    me.execute();
}
