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

    var MacAddresses = require('./node_modules/dash-button/build/MacAddresses.js');
    var Packets = require('./node_modules/dash-button/build/Packets.js');

    var pcap = require('pcap');
    var interfacee = "wlan0";
    var pcap_session = Packets.createCaptureSession(interfacee);
    pcap_session.addListener('packet', (rawPacket) => {
      let packet = pcap.decode(rawPacket);
      let sourceMacAddress = MacAddresses.getEthernetSource(packet);
      let flag = false;

      for (let property in buttons_config) {
        if(buttons_config[property].mac_addresses.indexOf(sourceMacAddress)>=0){
          const now = moment();
          const nowStr = now.format("YYYY/MM/DD HH:mm:ss");

          console.log('登録されたMACアドレスが検出されました:[%s]: %s: %s',property,sourceMacAddress,nowStr);
          logger.main.info('登録されたMACアドレスが検出されました:[%s]: %s: %s',property,sourceMacAddress,nowStr);
          flag = true;

          request(options[property], function (error, response, body) {
            if (!error) {
              console.log(body);
            }
          });

          break;
        }
      }
      if(!flag){
        const now = moment();
        const nowStr = now.format("YYYY/MM/DD HH:mm:ss");
        console.log('登録されていないMACアドレスが検出されました: %s: %s', sourceMacAddress,nowStr);
        logger.main.info('登録されていないMACアドレスが検出されました: %s: %s', sourceMacAddress,nowStr);
      }
    });
};

if(!module.parent){
  me.execute();
}
