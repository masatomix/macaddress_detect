# macaddress_detect

DHCPなどに対して流されたMac Addressを検知して、登録されているアドレスであればその検知をSlackへ通知するプログラム。


## インストール

```
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

をご参照

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
$ docker build -t macaddress_detect .
$ docker run --net=host -d \
 -v ${PWD}/logs:/home/macaddress_detec/logs \
 --name macaddress_detect \
 macaddress_detect
```
