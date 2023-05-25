# Assistant bot

## Installation guide

#### Backend

​	Copy `backend_code` to your server, create .env file with `OPENAI_ORG_ID` organization ID from OpenAI account, `OPENAI_API_KEY` api key from OpenAI account. Install requirements using command `pip3 install -r requirements.txt`. Launch `app.py` with command `python3 app.py`, or create systemd service to launch it automatically (on linux). Full list of commands listed down below:

```bash
git clone https://github.com/dennissoftman/BachelorDiploma.git
cp -r BachelorDiploma/backend_code /home/yourname/backend
cd /home/yourname/backend
echo OPENAI_ORG_ID=organization-id > .env
echo OPENAI_API_KEY=api-key >> .env
pip3 install -r requirements.txt
python3 app.py
```



#### Frontend

​	Copy `code` to your local folder, open Google Chrome, open `chrome://extensions` page, activate Developer Mode and load unpacked extension from `code` folder on your PC.