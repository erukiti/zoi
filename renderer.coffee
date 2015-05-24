ipc = require 'ipc'
express = require 'express'
path = require 'path'
fs = require 'fs'

app = express()

announceList = []
host = null

filelist = document.querySelector('#filelist')

getRandomX = () -> Math.floor(Math.random() * (16)).toString(16);

announce = (pathname) ->
	url = "http://#{host}#{pathname}"
	# size = fs.statSync(pathname).size()
	ipc.send 'announce', url
	row = filelist.insertRow -1
	row.insertCell(0).appendChild(document.createTextNode(path.basename(pathname)))
	row.insertCell(1).appendChild(document.createTextNode(url))
	# row.insertCell(2).appendChild(document.createTextNode(size))


# Fixme: 仮の名前
zoiSetup = (file) ->
	pathname = '/'
	for i in [0...40]
		pathname += getRandomX()
	pathname += '/' + path.basename file
	app.get pathname, (req, res) ->
		res.download file

	if host == null
		announceList.push pathname
	else
		announce pathname

ipc.on 'file-open', (files) ->
	# files = [files] if typeof files == 'string'
	for file in files
		zoiSetup file

ipc.on 'address', (address) ->
	host = "#{address}:3000"
	for pathname in announceList
		announce pathname
	announceList = []

app.listen 3000

body = document.querySelector('body')
body.addEventListener 'dragover', (ev) ->
	# console.dir(ev)
	ev.preventDefault()

body.addEventListener 'drop', (ev) ->
	ev.preventDefault()
	for file in ev.dataTransfer.files
		zoiSetup file.path

