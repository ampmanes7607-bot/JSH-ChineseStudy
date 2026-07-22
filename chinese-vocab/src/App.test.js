import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', async () => {
  render(<App />);
  expect(await screen.findByText('단어장')).toBeInTheDocument();
});
