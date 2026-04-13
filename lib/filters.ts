type SegmentRule = {
  field: string;
  comparator:
    | "equals"
    | "not_equals"
    | "contains"
    | "in"
    | "not_in"
    | "starts_with"
    | "ends_with"
    | "is_empty"
    | "is_not_empty"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"
    | "has"
    | "not_has";
  value?: unknown;
};

type SegmentGroup = {
  operator: "AND" | "OR";
  rules: Array<SegmentRule | SegmentGroup>;
};

function isGroup(rule: SegmentRule | SegmentGroup): rule is SegmentGroup {
  return "operator" in rule && Array.isArray(rule.rules);
}

function buildJsonArrayServiceCondition(field: string, comparator: "has" | "not_has", value: unknown) {
  const service = typeof value === "string" ? value.trim() : "";
  if (!service) {
    throw new Error(`Service comparator requires a value for ${field}`);
  }

  if (field === "services") {
    return comparator === "has"
      ? { customFieldsJson: { path: ["services"], string_contains: service } }
      : { NOT: { customFieldsJson: { path: ["services"], string_contains: service } } };
  }

  if (field === "company.services") {
    return comparator === "has"
      ? { company: { customFieldsJson: { path: ["services"], string_contains: service } } }
      : { NOT: { company: { customFieldsJson: { path: ["services"], string_contains: service } } } };
  }

  throw new Error(`Unsupported service field: ${field}`);
}

function buildFieldCondition(field: string, comparator: SegmentRule["comparator"], value: unknown) {
  if (field.startsWith("customFields.")) {
    const customKey = field.slice("customFields.".length);
    return buildFieldCondition(`customFieldsJson.${customKey}`, comparator, value);
  }

  if ((field === "services" || field === "company.services") && (comparator === "has" || comparator === "not_has")) {
    return buildJsonArrayServiceCondition(field, comparator, value);
  }

  const path = field.split(".");
  const leaf = path.pop();

  if (!leaf) {
    throw new Error(`Invalid field path: ${field}`);
  }

  let condition: Record<string, unknown>;

  switch (comparator) {
    case "equals":
      condition = { [leaf]: value };
      break;
    case "not_equals":
      condition = { [leaf]: { not: value } };
      break;
    case "contains":
      condition = { [leaf]: { contains: value, mode: "insensitive" } };
      break;
    case "starts_with":
      condition = { [leaf]: { startsWith: value, mode: "insensitive" } };
      break;
    case "ends_with":
      condition = { [leaf]: { endsWith: value, mode: "insensitive" } };
      break;
    case "in":
      condition = { [leaf]: { in: value } };
      break;
    case "not_in":
      condition = { [leaf]: { notIn: value } };
      break;
    case "is_empty":
      condition = { OR: [{ [leaf]: null }, { [leaf]: "" }] };
      break;
    case "is_not_empty":
      condition = { AND: [{ [leaf]: { not: null } }, { [leaf]: { not: "" } }] };
      break;
    case "gt":
      condition = { [leaf]: { gt: value } };
      break;
    case "gte":
      condition = { [leaf]: { gte: value } };
      break;
    case "lt":
      condition = { [leaf]: { lt: value } };
      break;
    case "lte":
      condition = { [leaf]: { lte: value } };
      break;
    case "between": {
      const [start, end] = Array.isArray(value) ? value : [undefined, undefined];
      condition = { [leaf]: { gte: start, lte: end } };
      break;
    }
    default:
      throw new Error(`Unsupported comparator: ${comparator}`);
  }

  return path.reverse().reduce<Record<string, unknown>>((acc, key) => ({ [key]: acc }), condition);
}

export function buildWhereFromSegment(group: SegmentGroup): Record<string, unknown> {
  const clauses = group.rules.map((rule) => {
    if (isGroup(rule)) {
      return buildWhereFromSegment(rule);
    }

    return buildFieldCondition(rule.field, rule.comparator, rule.value);
  });

  return {
    [group.operator === "AND" ? "AND" : "OR"]: clauses,
  };
}
