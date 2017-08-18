package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"html/template"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// TODO
// Stars - are they actually random
// Players
// Shots
// Score, Leaderboard, Name
// Rocket, Shot, Star SVG
// Background SVG
// Resize

// Star : stuff
type Star struct {
	Type  string  `json:"type"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Index int     `json:"i"`
}

// Player : stuff
type Player struct {
	Type   string  `json:"type"`
	ID     int     `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Radius int     `json:"r"`
}

// Client : stuff
type Client struct {
	conn *websocket.Conn
	send chan []byte
}

var stars [1000]Star
var r *rand.Rand
var players map[int]Player
var clients map[*Client]bool

func handleEvent(msg []string) []byte {
	if msg[0] == "NewPlayer" {
		name, _ := strconv.Atoi(msg[1])
		x, _ := strconv.ParseFloat(msg[2], 64)
		y, _ := strconv.ParseFloat(msg[3], 64)
		radius, _ := strconv.Atoi(msg[4])
		players[name] = Player{"Player", name, x, y, radius}
		player, _ := json.Marshal(players[name])
		return player
	} else if msg[0] == "UpdatePlayer" {
		name, _ := strconv.Atoi(msg[1])
		x, _ := strconv.ParseFloat(msg[2], 64)
		y, _ := strconv.ParseFloat(msg[3], 64)
		radius, _ := strconv.Atoi(msg[4])
		players[name] = Player{"Player", name, x, y, radius}
		player, _ := json.Marshal(players[name])
		return player
	} else if msg[0] == "RemoveStar" {
		i, _ := strconv.Atoi(msg[1])
		stars[i] = Star{"ReplaceStar", r.Float64() * 190, r.Float64() * 150, i}
		star, _ := json.Marshal(stars[i])
		return star
	}
	return []byte{}

}

func (c *Client) read() {
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			fmt.Println("Closing socket")
			c.conn.Close()
			close(c.send)
			delete(clients, c)
			return
		}
		event := handleEvent(strings.Split(string(msg), ","))
		for client := range clients {
			client.send <- event
		}
	}
}

func (c *Client) write() {
	for i := 0; i < 1000; i++ {
		star, _ := json.Marshal(stars[i])
		c.conn.WriteMessage(websocket.TextMessage, star)
	}

	for _, v := range players {
		player, _ := json.Marshal(v)
		c.conn.WriteMessage(websocket.TextMessage, player)
	}

	for {
		//fmt.Println(string((<-c.send)[:]))
		n := len(c.send)
		for i := 0; i < n; i++ {
			c.conn.WriteMessage(websocket.TextMessage, <-c.send)
		}
	}

}

func start(w http.ResponseWriter, r *http.Request) {
	game, _ := template.ParseFiles("templates/game.html")
	game.Execute(w, nil)
}

func ws(w http.ResponseWriter, r *http.Request) {
	conn, _ := websocket.Upgrade(w, r, w.Header(), 1024, 1024)
	client := &Client{conn: conn, send: make(chan []byte, 256)}
	clients[client] = true

	go client.write()
	go client.read()

}

func main() {
	players = make(map[int]Player)
	clients = make(map[*Client]bool)
	r = rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := 0; i < 1000; i++ {
		stars[i] = Star{"NewStar", r.Float64() * 190, r.Float64() * 150, i}
	}

	http.HandleFunc("/", start)
	http.HandleFunc("/websocket", ws)
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	fmt.Println("Starting server...")
	http.ListenAndServe(":8080", nil)
}
