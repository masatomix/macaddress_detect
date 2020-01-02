FROM ubuntu:16.04
LABEL maintainer "masatomix <masatomix@ki-no.org>"

# nodejs インストール
RUN apt update
RUN apt install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x |  bash -
RUN apt install -y nodejs
RUN apt install -y git
RUN apt install -y vim


# libpcap インストール
RUN apt install -y build-essential
RUN apt install -y libpcap-dev

ARG user="macaddress_detect"
ARG homeDir="/home/${user}"

RUN useradd ${user}
WORKDIR ${homeDir}

# RUN git clone https://github.com/masatomix/macaddress_detect.git
# RUN chown -R ${user}:${user} ${homeDir}
# RUN mv macaddress_detect/* ./

COPY ./ ./

# rootでないとダメなので su しない
# USER ${user}

# WORKDIR ${homeDir}
# Dockerに入れる場合は、eth0なので置換
# RUN sed -i -e 's/const interfacee = "wlan0";/const interfacee = "eth0";/g' ./index.js
# COPY ./config/local.json config/
# RUN ls -lrt

RUN npm install

CMD  ["node", "index.js"]