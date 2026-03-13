import { FAMachineType } from "./fa-type";
import { PDAMachineType } from "./pda-type";
import { TMMachineType } from "./tm-type";
import type { IMachineState, IMachineType } from "./types";

/**
 * Central registry of all supported automaton types.
 *
 * The Machine Type Registry implements the Registry pattern (Fowler, 2002)
 * to provide a single point of access for all machine type strategies.
 * This is the extensibility mechanism for the library: to add a new
 * automaton type, implement {@link IMachineType} and register it here.
 *
 * **How to add a new automaton type**:
 * 1. Create a new file (e.g., `lba-type.ts`) implementing `IMachineType<LBAState>`
 * 2. Create the corresponding graph class extending `AbstractGraph`
 * 3. Call `MachineTypeRegistry.register(new LBAMachineType())` at module load
 * 4. The new type will automatically work with the execution engine,
 *    step simulator, and all generic infrastructure.
 *
 * **Design pattern**: Registry (Fowler, 2002) + Strategy (Gamma et al., 1994).
 * The registry maps short names to strategy instances, enabling runtime
 * lookup of the appropriate strategy for a given graph type.
 *
 * @see Fowler, M. (2002). Patterns of Enterprise Application Architecture.
 *      Addison-Wesley. — Registry pattern.
 * @see Gamma, E., et al. (1994). Design Patterns. Addison-Wesley. — Strategy pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Yes this is a static class which could be a constant by definition - but I like OOP and having encapsulation - there is more than one reason I wouldn't choose to run JS on the server...
export class MachineTypeRegistry {
  private static readonly _types = new Map<string, IMachineType<IMachineState>>();

  /**
   * Registers a machine type strategy.
   *
   * @param type - The machine type strategy to register
   * @throws Error if a type with the same shortName is already registered
   */
  static register<TState extends IMachineState>(type: IMachineType<TState>): void {
    if (MachineTypeRegistry._types.has(type.shortName)) {
      throw new Error(`Machine type "${type.shortName}" is already registered. ` + `Each automaton type must have a unique shortName.`);
    }
    MachineTypeRegistry._types.set(type.shortName, type as unknown as IMachineType<IMachineState>);
  }

  /**
   * Retrieves a machine type strategy by its short name.
   *
   * @param shortName - The short name of the machine type (e.g., "FA", "TM", "PDA")
   * @returns The machine type strategy, or null if not found
   */
  static get(shortName: string): IMachineType<IMachineState> | null {
    return MachineTypeRegistry._types.get(shortName) ?? null;
  }

  /**
   * Retrieves a machine type strategy by its short name, throwing if not found.
   *
   * @param shortName - The short name of the machine type
   * @returns The machine type strategy
   * @throws Error if the type is not registered
   */
  static getOrThrow(shortName: string): IMachineType<IMachineState> {
    const type = MachineTypeRegistry.get(shortName);
    if (!type) {
      throw new Error(
        `Unknown machine type "${shortName}". ` + `Registered types: ${Array.from(MachineTypeRegistry._types.keys()).join(", ")}`,
      );
    }
    return type;
  }

  /**
   * Returns all registered machine type short names.
   */
  static getRegisteredTypes(): string[] {
    return Array.from(MachineTypeRegistry._types.keys());
  }

  /**
   * Returns all registered machine type strategies.
   */
  static getAll(): IMachineType<IMachineState>[] {
    return Array.from(MachineTypeRegistry._types.values());
  }

  /**
   * Checks whether a machine type is registered.
   */
  static has(shortName: string): boolean {
    return MachineTypeRegistry._types.has(shortName);
  }
}

// ─── Register Built-in Types ─────────────────────────────────────────
//
// The three standard automaton types from the Chomsky hierarchy are
// registered at module load time. Additional types can be registered
// by consumers of the library.

MachineTypeRegistry.register(new FAMachineType());
MachineTypeRegistry.register(new TMMachineType());
MachineTypeRegistry.register(new PDAMachineType());
