#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const readline = require('readline');

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const config = {
    endpoint: 'http://192.168.33.147:9000',
    accessKeyId: 'Infra',
    secretAccessKey: 'hIiRyCBZPDRBSYka##',
    region: 'us-east-1',
};

const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    blue:   '\x1b[34m',
    cyan:   '\x1b[36m',
    white:  '\x1b[37m',
    bgBlue: '\x1b[44m',
};

function print(msg = '')        { process.stdout.write(msg + '\n'); }
function info(msg)              { print(`  ${c.cyan}ℹ${c.reset}  ${msg}`); }
function success(msg)           { print(`  ${c.green}✔${c.reset}  ${msg}`); }
function warn(msg)              { print(`  ${c.yellow}⚠${c.reset}  ${msg}`); }
function error(msg)             { print(`  ${c.red}✖${c.reset}  ${msg}`); }
function divider()              { print(`  ${c.dim}${'─'.repeat(52)}${c.reset}`); }

function banner() {
    print();
    print(`  ${c.bold}${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
    print(`  ${c.bold}${c.cyan}║        RustFS Bucket Quota Manager  v1.0         ║${c.reset}`);
    print(`  ${c.bold}${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}`);
    print(`  ${c.dim}Endpoint: ${config.endpoint}${c.reset}`);
    divider();
    print();
}

function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

function ask(rl, question) {
    return new Promise(resolve => {
        rl.question(question, answer => resolve(answer.trim()));
    });
}

function askChoice(rl, question, choices) {
    return new Promise(async resolve => {
        while (true) {
            const answer = await ask(rl, question);
            const idx = parseInt(answer, 10);
            if (!isNaN(idx) && idx >= 1 && idx <= choices.length) {
                resolve(choices[idx - 1]);
                return;
            }
            warn(`Please enter a number between 1 and ${choices.length}`);
        }
    });
}

function askNumber(rl, question, min = 1) {
    return new Promise(async resolve => {
        while (true) {
            const answer = await ask(rl, question);
            const num = parseFloat(answer);
            if (!isNaN(num) && num >= min) {
                resolve(num);
                return;
            }
            warn(`Please enter a valid number (minimum ${min})`);
        }
    });
}

function askConfirm(rl, question) {
    return new Promise(async resolve => {
        while (true) {
            const answer = (await ask(rl, question)).toLowerCase();
            if (answer === 'y' || answer === 'yes') { resolve(true); return; }
            if (answer === 'n' || answer === 'no')  { resolve(false); return; }
            warn('Please enter y or n');
        }
    });
}

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function buildAuthHeaders(method, path, body = '') {
    const url = `${config.endpoint}${path}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const payloadHash = sha256(body);
    const host = new URL(url).host;

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

    const kDate    = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
    const kRegion  = hmac(kDate, config.region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
}

async function listBuckets() {
    const body = '';
    const path = '/';
    const headers = buildAuthHeaders('GET', path, body);

    const res = await fetch(`${config.endpoint}${path}`, { method: 'GET', headers });
    const text = await res.text();

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

    // Parse XML bucket list
    const matches = [...text.matchAll(/<Name>(.*?)<\/Name>/g)];
    return matches.map(m => m[1]);
}

async function setQuota(bucketName, quotaBytes) {
    const path = `/rustfs/admin/v3/quota/${bucketName}`;
    const body = JSON.stringify({ quota: quotaBytes, quota_type: 'HARD' });
    const headers = buildAuthHeaders('PUT', path, body);

    const res = await fetch(`${config.endpoint}${path}`, { method: 'PUT', headers, body });
    const text = await res.text();

    return { ok: res.ok, status: res.status, body: text };
}

function formatSize(bytes) {
    if (bytes >= 1099511627776) return `${(bytes / 1099511627776).toFixed(2)} TB`;
    if (bytes >= 1073741824)    return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576)       return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${bytes} bytes`;
}

function mbToBytes(mb) {
    return Math.round(mb * 1048576);
}

async function main() {
    banner();

    const rl = createRL();

    try {
        // Step 1: Fetch buckets
        process.stdout.write(`  ${c.dim}Fetching buckets from ${config.endpoint}...${c.reset}`);
        let buckets = [];
        try {
            buckets = await listBuckets();
            process.stdout.write(` ${c.green}done${c.reset}\n\n`);
        } catch (err) {
            process.stdout.write(` ${c.red}failed${c.reset}\n`);
            error(`Could not fetch buckets: ${err.message}`);
            warn('You can still enter a bucket name manually.');
            print();
            buckets = [];
        }

        let selectedBucket = '';

        if (buckets.length > 0) {
            print(`  ${c.bold}Available Buckets:${c.reset}`);
            buckets.forEach((b, i) => {
                print(`    ${c.cyan}${i + 1}.${c.reset} ${b}`);
            });
            print(`    ${c.cyan}${buckets.length + 1}.${c.reset} ${c.dim}Enter bucket name manually${c.reset}`);
            print();

            const allChoices = [...buckets, '__manual__'];
            const choice = await askChoice(
                rl,
                `  ${c.bold}Select bucket [1-${allChoices.length}]:${c.reset} `,
                allChoices
            );

            if (choice === '__manual__') {
                selectedBucket = await ask(rl, `\n  ${c.bold}Enter bucket name:${c.reset} `);
            } else {
                selectedBucket = choice;
            }
        } else {
            selectedBucket = await ask(rl, `  ${c.bold}Enter bucket name:${c.reset} `);
        }

        if (!selectedBucket) {
            error('Bucket name cannot be empty.');
            process.exit(1);
        }

        print();
        divider();

        print();
        print(`  ${c.bold}Set Quota for:${c.reset} ${c.cyan}${selectedBucket}${c.reset}`);
        print();
        info(`Enter quota size in MB  ${c.dim}(e.g. 1024 = 1 GB, 10240 = 10 GB)${c.reset}`);
        print();

        const quotaMB = await askNumber(
            rl,
            `  ${c.bold}Quota size (MB):${c.reset} `,
            1
        );

        const quotaBytes = mbToBytes(quotaMB);
        print();
        divider();

        // Step 4: Confirm
        print();
        print(`  ${c.bold}Summary:${c.reset}`);
        print(`    Bucket  : ${c.cyan}${selectedBucket}${c.reset}`);
        print(`    Quota   : ${c.yellow}${quotaMB} MB${c.reset} ${c.dim}(${formatSize(quotaBytes)})${c.reset}`);
        print(`    Type    : ${c.yellow}HARD${c.reset}`);
        print();

        const confirmed = await askConfirm(
            rl,
            `  ${c.bold}Apply this quota? [y/n]:${c.reset} `
        );

        print();

        if (!confirmed) {
            warn('Cancelled. No changes were made.');
            print();
            rl.close();
            return;
        }

        // Step 5: Apply quota
        process.stdout.write(`  ${c.dim}Applying quota...${c.reset}`);
        const result = await setQuota(selectedBucket, quotaBytes);
        process.stdout.write('\n');
        print();

        if (result.ok) {
            success(`${c.bold}${c.green}Quota applied successfully!${c.reset}`);
            print(`    ${c.dim}Bucket : ${selectedBucket}${c.reset}`);
            print(`    ${c.dim}Quota  : ${formatSize(quotaBytes)} (HARD)${c.reset}`);
        } else {
            error(`Failed to set quota (HTTP ${result.status})`);
            print(`    ${c.dim}${result.body}${c.reset}`);
        }

        print();
        divider();
        print();

    } catch (err) {
        print();
        error(`Unexpected error: ${err.message}`);
        print();
    } finally {
        rl.close();
    }
}

main();