import { paginator } from './../../src/helpers/general';

describe('Paginates correctly', () => {
  const testArray = [0, 1, 2];
  const pageSizeZero = 0;
  const pageSizeOne = 1;

  it('Correct Total Number', () => {
    const result = paginator(testArray);
    expect(result.pagination.totalElements).toBe(testArray.length);
  });

  it('Correct Number Of Pages', () => {
    const result = paginator(testArray, pageSizeOne);
    expect(result.pagination.totalPages).toBe(testArray.length / pageSizeOne);
  });

  it('Correct Content', () => {
    const result = paginator(testArray);
    expect(result.content[0].length).toBe(2);
  });

  it('Fake Pagination', () => {
    const result = paginator(testArray, pageSizeZero);
    expect(result.content).toBe(testArray);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.totalElements).toBe(testArray.length);
  });
});
