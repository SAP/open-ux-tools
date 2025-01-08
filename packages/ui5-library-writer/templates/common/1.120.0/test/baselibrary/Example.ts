import { ExampleColor } from '<%= libraryNamespaceURI %>/library';
import Example from '<%= libraryNamespaceURI %>/Example';

// Create a new instance of the Example control and
// place it into the DOM element with the id "content"
new Example({
  text: 'Example',
  color: ExampleColor.Highlight,
}).placeAt('content');
