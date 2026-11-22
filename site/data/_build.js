// Content builder shared by all unit files: assigns ids, source and sheet references.
//   lesson.ex = exercise label from the sheet ("0" = the first, unnumbered "Exercise")
//   question.n = item number in that exercise  → ref "Ex.<ex> #<n>"
export function unit(def) {
  def.lessons.forEach((l, i) => {
    l.id = `${def.id}-l${i + 1}`;
    l.questions.forEach((q, j) => {
      q.id = `${l.id}-q${String(j + 1).padStart(2, "0")}`;
      if (!q.source) q.source = l.kind === "toeic" ? "toeic" : "sheet";
      if (q.source === "sheet" && !q.ref) q.ref = `Ex.${q.ex ?? l.ex} #${q.n}`;
    });
  });
  return def;
}
