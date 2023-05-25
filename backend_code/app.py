#!/usr/bin/python3
import asyncio
from websockets.server import serve
from websockets.exceptions import ConnectionClosed
import openai
import orjson
import ssl
import pathlib
import os
from dotenv import load_dotenv
import logging
import time


load_dotenv()

logging.basicConfig()
logger = logging.getLogger('backend')
logger.setLevel(logging.DEBUG)


OPENAI_MODEL = "gpt-3.5-turbo"
openai.organization = os.getenv("OPENAI_ORG_ID")
openai.api_key = os.getenv("OPENAI_API_KEY")


def call_openai(chat_history, **kwargs) -> list:
    return openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=chat_history,
        **kwargs)

def to_openai_hist(h: dict):
    return {
        'role': 'assistant' if h.get('sender', '').lower() == 'assistant' else 'user',
        'content': h.get('text', '')
    }

async def sock_send(ws, *args):
    try:
        for data in args:
            await ws.send(data)
    except ConnectionClosed as ce:
        pass
    except Exception as ee:
        logger.error(f"sock_send: {str(ee)}")

    await asyncio.sleep(0)

async def echo(ws):
    async for msg in ws:
        req = orjson.loads(msg)
        action = str(req.get('action', '')).lower()
        if action == 'explain':
            text = req.get('text', '')
            for _ in range(3):
                try:
                    ai_resp = call_openai([{'role': 'user', 'content': text}], stream=True)
                    break
                except:
                    ai_resp = None
                    await asyncio.sleep(1.5)
                    continue

            if ai_resp is None:
                await sock_send(ws, orjson.dumps({'error': "Failed to process streaming request (OpenAI issue)"}))
                return

            for resp in ai_resp:
                if resp.get('finish_reason', None):
                    break

                choices = resp.get('choices', [])
                if len(choices) == 0:
                    continue
                text = choices[0].get('delta', {}).get('content', '')
                if len(text) > 0:
                    await sock_send(ws, orjson.dumps({'type': 'answer', 'text': text}))

            await sock_send(ws, orjson.dumps({'type': 'stop'}))
        elif action == 'chat':
            logger.info(f"Received CHAT request: {req}")
            history = list(req.get('history', []))
            if len(history) > 0:
                req_history = [to_openai_hist(h) for h in history]
                for _ in range(5):
                    try:
                        ai_resp = call_openai(req_history)
                        break
                    except Exception as e:
                        ai_resp = None
                        logger.warning("Failed to process request, trying again...")
                        await asyncio.sleep(1.5)
                        continue

                if ai_resp is None:
                    await sock_send(ws, orjson.dumps({'error': "Failed to process request (OpenAI issue)"}))
                    return

                msg_lines = list()
                for choice in ai_resp.get('choices', []):
                    msg_lines.append(choice.get('message', {}).get('content', ""))
                    if choice.get('finish_reason', "stop") == 'stop':
                        break

                # for now without streaming
                resp = {'type': 'answer', 'data': '\n'.join(msg_lines)}
                await sock_send(ws, orjson.dumps(resp), orjson.dumps({'type': 'stop'}))
                logger.info(f"Returned response: {resp}")
            else:
                await sock_send(ws, orjson.dumps({'error': "Empty request!"}))

ws_args = {}
if pathlib.Path('./certs').exists():
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    cert_pem = pathlib.Path('./certs/domain_chain.crt')
    key_pem = pathlib.Path('./certs/key.pem')
    ssl_context.load_cert_chain(cert_pem, keyfile=key_pem)
    ws_args['ssl'] = ssl_context

async def main():
    host, port = '0.0.0.0', 8765
    logger.info(f"Starting server at '{host}:{port}'")
    async with serve(echo, host, port, **ws_args):
        await asyncio.Future()

asyncio.run(main())