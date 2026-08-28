import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * A column of a `<DataTable>`. The header text doubles as the label printed in
 * front of the cell on phones, so it is written once. Give an object to add a
 * class to the header cell (`text-right`, `text-center`…), and an empty string
 * for a column with no name (actions).
 */
export type DataColumn = string | { label: string; className?: string };

const labelOf = (c: DataColumn | undefined) => (typeof c === "string" ? c : (c?.label ?? ""));
const classOf = (c: DataColumn | undefined) => (typeof c === "string" ? undefined : c?.className);

type CellProps = { colSpan?: number; "data-label"?: string };

/** Copies the column name onto each `<td>` of one row, in order. */
function labelRow(row: ReactElement<{ children?: ReactNode }>, head: DataColumn[]) {
  let col = 0;
  const cells = Children.map(row.props.children, (cell) => {
    if (!isValidElement<CellProps>(cell)) return cell;
    const label = labelOf(head[col]);
    col += cell.props.colSpan ?? 1;
    if (!label || cell.props["data-label"] !== undefined) return cell;
    return cloneElement(cell, { "data-label": label });
  });
  return cloneElement(row, undefined, cells);
}

/**
 * The admin data table. Write the rows as plain `<tr>` / `<td>`; the column
 * names given in `head` are rendered as the header row *and* stamped on every
 * cell (`data-label`), which is what lets a row fold into a small card under
 * 768 px (see `.data-table.stacked` in `globals.css`).
 */
export function DataTable({
  head,
  headless,
  className,
  children,
}: {
  head: DataColumn[];
  /** No header row (a short list that reads fine without one); cells keep their labels. */
  headless?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <table className={["data-table", "stacked", className].filter(Boolean).join(" ")}>
      {!headless && (
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i} className={classOf(c)}>
                {labelOf(c)}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {Children.map(children, (row) => (isValidElement<{ children?: ReactNode }>(row) ? labelRow(row, head) : row))}
      </tbody>
    </table>
  );
}
