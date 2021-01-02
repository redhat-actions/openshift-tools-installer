import { Inputs } from "../generated/inputs-outputs";

// https://devblogs.microsoft.com/typescript/announcing-typescript-4-1/#template-literal-types
// neat
export type InstallableClient = `${Inputs}`;
