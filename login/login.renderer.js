// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);


require('dotenv').config();
var crypto = require('crypto');
const {app, BrowserWindow} = require('electron').remote
// const {ipcRenderer: ipc} = require('electron');
const {ipcRenderer} = require('electron')
const sgMail = require('@sendgrid/mail');
// const Store = require('../../src/store.js');
const Store = require('electron-store');

const path = require('path')

const schema = {
	windowBounds: {
		type: 'number',
		maximum: 100,
		minimum: 1,
		default: 50
	},
	user: {
		default: {
			session_stamp: undefined,
			hashed_code: undefined
		}
	}
};

const store = new Store({schema});

console.log(store.get('user'));

function action() {
  document.querySelector('#next-btn').addEventListener('click', () => {
    myConsole.log('next button pressed')
    user = document.querySelector('#email').value;
    email = user + '@' + process.env.domain;
    store.set('user.id', user)

    myConsole.log('Email: ' + email)
    
    code = Math.floor(100000 + Math.random() * 900000);
    myConsole.log(code)
    var hashed_code = crypto.createHash('md5').update(code.toString()).digest('hex');

    store.set('user.hashed_code',  hashed_code );

    subject = 'Internal DevDuo Code - ' + code;

    myConsole.log(process.env.SENDGRID_API_KEY)

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    var msg = {
      to: email,
      from: 'internal@devduo.com',
      subject: subject,
      text: 'Your login code is: <code> ' + code + ' </code>',
      html: 'Your login code is: <code> ' + code + ' </code>',
    };
    sgMail.send(msg);

    var x = document.getElementById("login-form");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }

    var x = document.getElementById("verify-form");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }

  });

  var input = document.getElementById("email");
  input.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("next-btn").click();
    }
  });

  document.querySelector('#login-btn').addEventListener('click', () => {
    enteredCode = document.querySelector('#verify-code').value;
    hashedEnteredCode = crypto.createHash('md5').update(enteredCode).digest('hex');

    hashed_code = store.get('user.hashed_code');

    if (hashedEnteredCode == hashed_code) {
      var elem = document.getElementById("progress-bar");
      var id = setInterval(frame, 3); //change to 33
      var width = 1;
      function frame() {
        if (width >= 100) {
          clearInterval(id);
            // ----------------

            session_stamp = Date.now();
            store.set('user.session_stamp', session_stamp );

            ipcRenderer.send('asynchronous-message', 'ping')
                        
            document.getElementById('close').click();
            
          // after progress finishes close login window
        } else {
          width++;
          elem.style.width = width + '%';
        }
      }

      var x = document.getElementById("verify-form");
      if (x.style.display === "none") {
        x.style.display = "block";
      } else {
        x.style.display = "none";
      }

      var x = document.getElementById("verify");
      if (x.style.display === "none") {
        x.style.display = "block";
      } else {
        x.style.display = "none";
      }

    } else {
      document.getElementById('error').style.color = "red";
      document.getElementById('error').innerHTML = "Wrong code";
      // console.log("Wrong code!!");
    }

  });

  var input = document.getElementById("verify-code");
  input.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("login-btn").click();
    }
  });

  // $('#theprogressbar').attr('aria-valuenow', newprogress).css('width', newprogress);


}

action()
