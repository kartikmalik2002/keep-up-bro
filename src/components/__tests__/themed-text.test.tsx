import React from 'react';
import renderer from 'react-test-renderer';
import { ThemedText } from '../themed-text';

describe('ThemedText', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<ThemedText>Hello World</ThemedText>).toJSON();
    expect(tree).toBeDefined();
  });
});
