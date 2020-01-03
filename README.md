# macaddress_detect

DHCPなどに対して流されたMac Addressを検知して、登録されているアドレスであればその検知をSlackへ通知するプログラム。


## インストール

```
$ node --version
v8.11.3   // じゃないとダメっぽい。
$ sudo apt-get install -y build-essential
$ sudo apt-get install -y libpcap-dev
$ git clone https://github.com/masatomix/macaddress_detect.git
$ cd macaddress_detect
$ npm install
$ sudo node index.js
```

でOKかと。

## 設定ファイル

```
config/default.json
```

をご参照。また、Firestoreの ``/app_settings/macaddress_detect/buttons/{docId}`` に

```
{
    "mac_addresses": ["xx:xx:xx:xx:xx:xx"],
    "bot_url": "/xxxxxxxxx/xxxxxxxxx/xxxxxxxxxxxxxxxxxxxxxxxx",
    "message": "xxxxx",
    "channel": "#general"
},
```

という情報を持つことで、該当するMacアドレスが見つかったとき、該当のSlackチャンネルへ通知を行います。


## サービス化したいばあい。

### Systemd のファイルコピー

```
$ sudo cp -pfr  ./macaddress-detect.service /etc/systemd/system/
```
あとは自動起動設定

```
$ sudo systemctl enable macaddress-detect
Created symlink /etc/systemd/system/multi-user.target.wants/macaddress-detect.service → /etc/systemd/system/macaddress-detect.service.

$ sudo systemctl list-unit-files --type service | grep macaddress-detect
macaddress-detect.service                            enabled
```

サービスの起動は下記コマンドで。

```
$ sudo systemctl start  macaddress-detect

```

最後にログの参照方法


```
$ sudo journalctl  -f -u macaddress-detect
```

## Dockerを使う場合、

```
$ git clone https://github.com/masatomix/macaddress_detect.git
$ cd macaddress_detect
$ sudo docker-compose up -d --build
```

などで。。。


## 改訂履歴

- 1.0.0 Macアドレスの情報をFirestore側に持つように変更。
- 0.9.5 docker-compose 追加