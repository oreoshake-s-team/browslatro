import { render, screen } from "@testing-library/react";
import RenderProfiler from "./RenderProfiler";
import { getRenderProfilingRecords, resetRenderProfilingRecords } from "./renderProfiling";

const FLAG_KEY = "browslatro:renderProfiling";

beforeEach(() => {
  resetRenderProfilingRecords();
  window.localStorage.removeItem(FLAG_KEY);
});

afterEach(() => {
  window.localStorage.removeItem(FLAG_KEY);
});

test("renders children when profiling is disabled", () => {
  render(
    <RenderProfiler id="Widget">
      <div>content</div>
    </RenderProfiler>,
  );
  expect(screen.getByText("content")).toBeInTheDocument();
  expect(getRenderProfilingRecords()).toEqual([]);
});

test("records a render when profiling is enabled", () => {
  window.localStorage.setItem(FLAG_KEY, "1");
  render(
    <RenderProfiler id="Widget">
      <div>content</div>
    </RenderProfiler>,
  );
  expect(screen.getByText("content")).toBeInTheDocument();
  const records = getRenderProfilingRecords();
  expect(records).toHaveLength(1);
  expect(records[0]?.id).toBe("Widget");
});
