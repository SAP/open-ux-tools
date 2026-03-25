/**
 * Defines the React 16 Adapter for Enzyme.
 *
 * @link http://airbnb.io/enzyme/docs/installation/#working-with-react-16
 * @copyright 2017 Airbnb, Inc.
 */
const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');
const { MessageChannel, MessagePort } = require('node:worker_threads');

if (global.TextDecoder === undefined) {
	global.TextDecoder = TextDecoder;
}

if (global.TextEncoder === undefined) {
	global.TextEncoder = TextEncoder;
}

if (global.ReadableStream === undefined) {
	global.ReadableStream = ReadableStream;
}

if (global.TransformStream === undefined) {
	global.TransformStream = TransformStream;
}

if (global.WritableStream === undefined) {
	global.WritableStream = WritableStream;
}

if (global.MessagePort === undefined) {
	global.MessagePort = MessagePort;
}

if (global.MessageChannel === undefined) {
	global.MessageChannel = MessageChannel;
}

const enzyme = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');

enzyme.configure({ adapter: new Adapter() });
