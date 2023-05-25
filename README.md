# Assistant bot

## Installation guide

#### Backend

​	Copy `backend_code` to your computer (or server), create .env file with `OPENAI_ORG_ID` organization ID from OpenAI account, `OPENAI_API_KEY` API key from OpenAI account. Install requirements using command `pip3 install -r requirements.txt`. Launch `app.py` with command `python3 app.py`, or create systemd service to launch it automatically (on Linux). Full list of commands listed down below:

```bash
git clone https://github.com/dennissoftman/BachelorDiploma.git
cp -r BachelorDiploma/backend_code /home/yourname/backend
cd /home/yourname/backend
echo OPENAI_ORG_ID=organization-id > .env
echo OPENAI_API_KEY=api-key >> .env
pip3 install -r requirements.txt
python3 app.py
```

​	Please note, that in order to run this code on your server, you must have domain name registered and have SSL certificate (making requests to self-signed certificates or to insecure websocket is forbidden from extension code). You can buy domain name and certificate on [Namecheap](https://www.namecheap.com/), or from any other domain registrar and SSL issuer. Then you need to make sure that you have `domain_chain.crt` (you can read how to make a certificate chain [here](https://www.namecheap.com/support/knowledgebase/article.aspx/9419/33/installing-an-ssl-certificate-on-nginx/#cmbn)) and `key.pem` (you get your `key.pem` when you buy SSL certificate) in `certs/` directory inside `/home/yourname/backend/` folder. So finally your `backend/` directory will look like this on your server:

```bash
backend/
	.env
	app.py
	certs/
		domain_chain.crt
		key.pem
	requirements.txt
```



#### Frontend

​	Copy `code/` to your local folder. In order to configure API URL you should change `WEBSOCKET_ADDR` in `content.js` and `background.js` to your localhost address (e.g. `ws://localhost:8765`), or use your server domain (e.g. `wss://mydomain.org:8765`). To install extension in browser, you should open Google Chrome, open `chrome://extensions` page, activate Developer Mode and load unpacked extension from `code` folder on your PC.