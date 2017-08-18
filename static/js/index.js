var stars;
var ws;
var myFollower;
var myStars = [];
var myEnemies = {};
var myShots = [];
var mouseX = 0;
var mouseY = 0;

document.addEventListener('mousemove', onMouseUpdate, false);
document.addEventListener('mouseenter', onMouseUpdate, false);
document.addEventListener('keypress', onKepPress, false);

function startGame() {
  ws = new WebSocket("ws://" + document.location.host + "/websocket");

  myFollower = new intComponent(10, 10, 0, 256, 0, 1, Math.random() * 190, Math.random() * 150, 200);


  ws.onopen = function() {
    var d = new Date();
    var id = Math.abs(parseInt(d.getTime() + Math.random() * 104773 + Math.random() * 179426549));
    myFollower.id = id;
    ws.send("NewPlayer," + myFollower.id + "," + myFollower.x + "," + myFollower.y + "," + myFollower.radius);
  };

  ws.onmessage = function(evt) {
    data = JSON.parse(evt.data);
    if (data.type == "NewStar") {
      myStars.push(new extComponent(10, 10, 256, 256, 256, 1, data.x, data.y));
    } else if (data.type == "ReplaceStar") {
      myStars[data.i] = new extComponent(10, 10, 256, 256, 256, 1, data.x, data.y);
    } else if (data.type == "Player") {
      if (data.id != myFollower.id) {
        if (data.id in myEnemies) {
          myEnemies[data.id].x = data.x;
          myEnemies[data.id].y = data.y;
        } else {
          myEnemies[data.id] = new extComponent(30, 30, 0, 0, 256, 1, data.x, data.y);
        }
      }
    }
  };

  ws.onclose = function() {
    ws.send("RemovePlayer,name");
  };

  myGameArea.start();

}

var myGameArea = {
  canvas: document.createElement("canvas"),
  start: function() {
    this.canvas.width = 1400;
    this.canvas.height = 750;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    this.interval = setInterval(updateGameArea, 20);
  },
  clear: function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
};

function extComponent(width, height, r, g, b, t, x, y) {
  this.width = width;
  this.height = height;
  this.x = x;
  this.y = y;
  this.update = function() {
    ctx = myGameArea.context;
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + t + ')';
    ctx.fillRect((this.x - myFollower.x) * 50 + 1400 / 2 - 15, (this.y - myFollower.y) * 50 + 700 / 2 + 10, this.width, this.height); // 50 is speed factor
  };
}

function shotComponent(width, height, r, g, b, t, x, y, angle, life) {
  this.width = width;
  this.height = height;
  this.x = x;
  this.y = y;
  this.angle = angle;
  this.life = life;
  this.update = function() {
    this.life--;
    this.x += Math.cos(angle);
    this.y += Math.sin(angle);
    ctx = myGameArea.context;
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + t + ')';
    ctx.fillRect((this.x - myFollower.x) * 50 + 1400 / 2 - 15, (this.y - myFollower.y) * 50 + 700 / 2 + 10, this.width, this.height); // 50 is speed factor
  };
}

function intComponent(width, height, r, g, b, t, x, y, radius) {
  this.width = width;
  this.height = height;
  this.id = -1;
  this.x = x;
  this.y = y;
  this.radius = radius;
  this.update = function() {
    h = Math.sqrt(mouseX * mouseX + mouseY * mouseY) * 10; // 10 is size of board factor
    diffX = mouseX / h;
    diffY = mouseY / h;
    if (h > 0 && this.x + diffX >= 0 && this.x + diffX <= 190) {
      this.x += diffX;
    }
    if (h > 0 && this.y + diffY >= 0 && this.y + diffY <= 150) {
      this.y += diffY;
    }

    ws.send("UpdatePlayer," + this.id + "," + this.x + "," + this.y + "," + this.radius);

    ctx = myGameArea.context;
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + t + ')';
    ctx.fillRect(this.x + 1400 - 220, this.y + 700 - 130, this.width, this.height);
    ctx.fillStyle = 'rgba(256,0,0,1)';
    ctx.fillRect(1400 / 2 - 15, 750 / 2 - 15, 30, 30);
    ctx.fillStyle = 'rgba(192,192,192,0.3)';
    ctx.fillRect(1400 - 220, 750 - 180, 200, 160);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(1400 / 2, 700 / 2 + 25, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "red";
    ctx.stroke();
  };
}

function updateGameArea() {
  myGameArea.clear();
  myFollower.update();
  var i;
  for (i = myStars.length - 1; i >= 0; i--) {
    if (Math.abs(myStars[i].x - myFollower.x) * 50 > 20 || Math.abs(myStars[i].y - myFollower.y) * 50 > 20) {
      myStars[i].update();
    } else {
      myStars[i].x = -1000;
      myStars[i].y = -1000;
      myFollower.radius += 20;
      ws.send("RemoveStar," + i);
    }
  }
  for (var id in myEnemies) {
    myEnemies[id].update();
  }
  for (i = myShots.length - 1; i >= 0; i--) {
    if (myShots[i].life <= 0) {
      myShots.splice();
    } else {
      myShots[i].update();
    }
  }
  // TODO: for each of othershots. show. if any are a hit, die and distribute start wealth
}

function onMouseUpdate(e) {
  mouseX = e.pageX - 1400 / 2;
  mouseY = e.pageY - 750 / 2;
}

function onKepPress(e) {
  if (e.keyCode == 32) {
    angle = (mouseX > 0) ? Math.atan(mouseY / mouseX) : Math.atan(mouseY / mouseX) + Math.PI;
    myShots.push(new shotComponent(10, 10, 256, 256, 0, 1, myFollower.x, myFollower.y, angle, myFollower.radius / 50));
    if (myFollower.radius > 100) {
      myFollower.radius--;
    }
  }
}
