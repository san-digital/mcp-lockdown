import { ZodSchema, z } from "zod";

export function compareSchemas(
    a: ZodSchema<unknown>,
    b: ZodSchema<unknown>
): boolean {
    try {
        const aDef = JSON.stringify(a._def, null, 2);
        const bDef = JSON.stringify(b._def, null, 2);
        
        if (aDef === bDef) {
            return true;
        }
        
        if (a instanceof z.ZodObject && b instanceof z.ZodObject) {
            const aShape = "shape" in a && a.shape ? Object.keys(a.shape) : [];
            const bShape = "shape" in b && b.shape ? Object.keys(b.shape) : [];
            
            if (aShape.length !== bShape.length) {
                return false;
            }
            
            for (const key of aShape) {
                if (!bShape.includes(key)) {
                    return false;
                }
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.warn("Schema comparison failed:", error);
        return false;
    }
}

export function createSchemaFromJson(jsonSchema: unknown): ZodSchema<unknown> {
    if (typeof jsonSchema === "object" && jsonSchema !== null) {
        const schema = jsonSchema as Record<string, unknown>;
        
        if (schema.type === "object" && schema.properties) {
            const properties = schema.properties as Record<string, unknown>;
            const required = schema.required as string[] || [];
            const shape: Record<string, ZodSchema<unknown>> = {};
            
            for (const [key, prop] of Object.entries(properties)) {
                const propSchema = prop as Record<string, unknown>;
                let zodProp: ZodSchema<unknown>;
                
                switch (propSchema.type) {
                    case "string":
                        zodProp = z.string();
                        break;
                    case "number":
                        zodProp = z.number();
                        break;
                    case "integer":
                        zodProp = z.number().int();
                        break;
                    case "boolean":
                        zodProp = z.boolean();
                        break;
                    case "array":
                        zodProp = z.array(z.unknown());
                        break;
                    default:
                        zodProp = z.unknown();
                }
                
                if (required.includes(key)) {
                    shape[key] = zodProp;
                } else {
                    shape[key] = zodProp.optional();
                }
            }
            
            return z.object(shape);
        }
    }
    
    return z.unknown();
}