const Toypad = require('@jonyo/toypad');
const WebSocket = require('ws');
const debug = require('debug')('toypad-scratch');

let wss = new WebSocket.Server({ port: 8080 }),
	toypad = new Toypad(),
	socket = null;


/**
 * Initialize the minifigs here...  Note that any to be interacted with must also be defined in scratch_ext.js
 */
Toypad.Minifig.add(new Toypad.Minifig('STEVE', '65 9e 22 4c 58 80'));
Toypad.Minifig.add(new Toypad.Minifig('MINECART', '58 a9 62 58 58 80'));
Toypad.Minifig.add(new Toypad.Minifig('IRONMAN', '5a a9 62 58 58 80'));
// Oops... lost the nfc tag for now...
//Toypad.Minifig.add(new Toypad.Minifig('IRONCAR', ''));
Toypad.Minifig.add(new Toypad.Minifig('WENDY', '7a 9e 22 4c 58 80'));
Toypad.Minifig.add(new Toypad.Minifig('WENDYCAR', '42 a9 62 58 58 80'));

toypad.connect();

toypad.on('connected', function() {
	debug('connected to toypad');
});


toypad.on('minifig-scan', function(e) {
	debug('received minifig-scan');
	if (!e.minifig) {
		// do not care if it is not known minifig
		debug('unknown minifig, ignoring...');
		return;
	}
	if (!socket) {
		debug('No connection established to scratch');
		return;
	}
	if (e.action === Toypad.actions.ADD) {
		debug('sending minifigAdd command to scratch');
		socket.send(JSON.stringify({command: 'minifigAdd', panel: e.panel, minifig: e.minifig}));
	} else if (e.action === Toypad.actions.REMOVE) {
		debug('sending minifigRemove command to scratch');
		socket.send(JSON.stringify({command: 'minifigRemove', panel: e.panel, minifig: e.minifig}));
	} else {
		debug('action not known: %o', e.action);
	}
});

wss.on('connection', function connection(ws) {
	debug('connection established to scratch extension...');
	socket = ws;
	socket.on('message', function incoming(message) {
		var data = JSON.parse(message);
		switch (data.command) {
			case 'panelChange':
				var panel = Toypad.panels[data.panel] || null;
				if (!panel) {
					debug('Invalid panel: %s', data.panel);
					return;
				}
				var color = Toypad.colors[data.color] || null;
				if (color === null) {
					debug('Invalid color %s', data.color);
					return;
				}
				toypad.panelChange(panel, color);
				break;

			case 'panelFade':
				var panel = Toypad.panels[data.panel] || null;
				if (!panel) {
					debug('Invalid panel: %s', data.panel);
					return;
				}
				var color = Toypad.colors[data.color] || null;
				if (color === null) {
					debug('Invalid color %s', data.color);
					return;
				}
				if (typeof data.secondsPerChange === 'undefined') {
					debug('secondsPerChange required');
					return;
				}
				if (typeof data.changeCount === 'undefined') {
					debug('changeCount required');
					return;
				}
				toypad.panelFade(panel, color, parseFloat(data.secondsPerChange), parseInt(data.changeCount));
				break;

			case 'panelFlash':
				var panel = Toypad.panels[data.panel] || null;
				if (!panel) {
					debug('Invalid panel: %s', data.panel);
					return;
				}
				var color = Toypad.colors[data.color] || null;
				if (color === null) {
					debug('Invalid color %s', data.color);
					return;
				}
				if (typeof data.onSecondsPerChange === 'undefined') {
					debug('onSecondsPerChange required');
					return;
				}
				if (typeof data.offSecondsPerChange === 'undefined') {
					debug('offSecondsPerChange required');
					return;
				}
				if (typeof data.changeCount === 'undefined') {
					debug('changeCount required');
					return;
				}
				toypad.panelFlash(
					panel,
					color,
					parseFloat(data.onSecondsPerChange),
					parseFloat(data.offSecondsPerChange),
					parseInt(data.changeCount)
				);
				break;

			case 'shutdown':
				// todo: anything to do?
				debug('shutdown received from scratch');
				break;

			default:
				debug('Unknown command received from scratch: %o', data.command);
				debug('Full data: %O', data);
				break;
		}
	});
});
