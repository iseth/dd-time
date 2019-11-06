var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

var config = require('../config/config.json');
var crypt = require('crypto');
const {app, BrowserWindow} = require('electron').remote
const {ipcRenderer} = require('electron')
const sgMail = require('@sendgrid/mail');
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

function action() {
  document.querySelector('#next-btn').addEventListener('click', () => {
    user = document.querySelector('#email').value;
    email = user + '@' + config.domain;
    store.set('user.id', user)
    
    code = Math.floor(100000 + Math.random() * 900000);
    var hashed_code = crypt.createHash('md5').update(code.toString()).digest('hex');

    store.set('user.hashed_code',  hashed_code );

    subject = 'Internal DevDuo Code - ' + code;

    sgMail.setApiKey(config.SENDGRID_API_KEY);

    // myConsole.log(code)

    var msg = {
      to: email,
      from: 'internal@devduo.com',
      subject: subject,
      text: 'Your login code is: <code> ' + code + ' </code>',
      html: 'Your login code is: <code> ' + code + ' </code>',
    };
    sgMail.send(msg)
    .then((response) => myConsole.log(response))
    .catch((error) => myConsole.log(error))

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
    hashedEnteredCode = crypt.createHash('md5').update(enteredCode).digest('hex');

    hashed_code = store.get('user.hashed_code');

    if (hashedEnteredCode == hashed_code) {
      var elem = document.getElementById("progress-bar");
      var id = setInterval(frame, 4); //change to 33
      var width = 1;
      function frame() {
        if (width >= 100) {
          clearInterval(id);
            // ----------------

            session_stamp = Date.now();
            store.set('user.session_stamp', session_stamp );

            ipcRenderer.send('login-success', 'ping')

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
  document.querySelector('#close').addEventListener('click', () => {
      ipcRenderer.send('quit-button-pressed', 'ping')

  })

}

action()