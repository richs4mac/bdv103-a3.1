import { z } from "zod";
import { book_collection } from "../database_access.js";
import { type Book } from "../../adapter/assignment-2.js";
import { ZodRouter } from "koa-zod-router";
import { WithId } from "mongodb";

export default function books_list(router: ZodRouter) {

    router.register({
        name: "list books",
        method: "get",
        path: "/books",
        validate: {
            query: z.object({
                filters: z.object({
                    from: z.coerce.number().optional(),
                    to: z.coerce.number().optional(),
                    name: z.string().optional(),
                    author: z.string().optional()
                }).array().optional()
            })
        },
        handler: async (ctx, next) => {
            const { filters } = ctx.request.query;

            const query = filters && filters.length > 0 ? {
                $or: filters.map(({ from, to, name, author }) => {
                    const filter: { $gte?: number, $lte?: number; name?: string; author?: string; } = {};
                    let valid = false;
                    if (from) {
                        valid = true;
                        filter.$gte = from;
                    }
                    if (to) {
                        valid = true;
                        filter.$lte = to;
                    }
                    if (name) {
                        valid = true;
                        filter.name = name;
                    }
                    if (author) {
                        valid = true;
                        filter.author = author;
                    }
                    return valid ? filter : false;
                }).filter(value => value !== false).map((filter) => {
                    return { price: { $gte: filter.$gte, $lte: filter.$lte }, name: filter.name, author: filter.author };
                })
            } : {};

            const book_list = await book_collection.find(query).map((document: WithId<Book>) => {
                const book: Book = {
                    // NOTE I don't think toHexString is a real thing
                    // https://stackoverflow.com/a/75634440
                    id: document._id.toString('hex'),
                    name: document.name,
                    image: document.image,
                    price: document.price,
                    author: document.author,
                    description: document.description
                };
                return book;
            }).toArray();

            ctx.body = book_list;
            await next();
        }
    });
}