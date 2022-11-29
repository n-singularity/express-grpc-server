const express = require('express');
const app = express()
const port = 3001

let total_web_openend = 0;

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/plus-one', (req, res) => {
    total_web_openend++;
    res.send(total_web_openend.toString());
})

const PROTO_PATH = './app/grpc/protos/hitung_streaming_luas.proto'
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    long: String,
    enum: String,
    defaults: true,
    oneofs: true,
});

let luas_proto = grpc.loadPackageDefinition(packageDefinition).hitungluas

function luasPersegiPanjang(call, callback) {
    callback(null, fungsiHitungPersegiPanjang(call.request));
}

function fungsiHitungPersegiPanjang(parameters) {
    let luasHasilHitung;
    console.log(parameters);
    luasHasilHitung = parameters.panjang * parameters.lebar;

    return {
        message: 'OK',
        luas: luasHasilHitung
    }
}


function routeCountWebOpened(call) {
    let callStatus = 'on'
    call.on('data', function (requester) {
        let lastRecord = -1;
        function myEventHandler () {

            if (lastRecord !== total_web_openend)   {
                lastRecord = total_web_openend;
                console.log('send reply to ', requester.id, ' with value ', total_web_openend);
                call.write({total: total_web_openend});
            }

            let myTimeout = setTimeout(function() {
                if (callStatus === 'on'){
                    myEventHandler()
                }else {
                    clearTimeout(myTimeout);
                }
                }, 1000);
        }

        myEventHandler();
    })
    call.on('end', function () {
        callStatus = 'off';
        console.log('end')
        call.end();
    })
}

function main() {
    let server = new grpc.Server();
    server.addService(
        luas_proto.HitungLuas.service, {
            LuasPersegiPanjang: luasPersegiPanjang,
            CountWebOpened: routeCountWebOpened,
        }
    );

    server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
    server.start();
    console.log('grpc Server Running on 0.0.0.0:50051');
}

main();

app.listen(port, () => {
    console.log(`app listening on http://127.0.0.1:3001`)
});