import App from '../App';

describe('App', () => {
  it('should be defined', () => {
    expect(App).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof App).toBe('function');
  });
});
