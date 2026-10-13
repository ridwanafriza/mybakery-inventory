<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'PT Tepung Sejahtera',
                'contact_person' => 'Hendra Wijaya',
                'phone' => '0812-3456-7890',
                'email' => 'hendra@tepungsejahtera.co.id',
                'address' => 'Jl. Industri Raya No. 15, Tangerang',
                'lead_time_days' => 2,
            ],
            [
                'name' => 'CV Dairy Fresh',
                'contact_person' => 'Sari Dewi',
                'phone' => '0813-9876-5432',
                'email' => 'sari@dairyfresh.co.id',
                'address' => 'Jl. Peternakan Utama No. 8, Bogor',
                'lead_time_days' => 1,
            ],
            [
                'name' => 'PT Gula Nusantara',
                'contact_person' => 'Budi Santoso',
                'phone' => '0821-1234-5678',
                'email' => 'budi@gulanusantara.co.id',
                'address' => 'Jl. Perkebunan No. 22, Palembang',
                'lead_time_days' => 3,
            ],
            [
                'name' => 'PT Frozen Food Indonesia',
                'contact_person' => 'Rina Hartati',
                'phone' => '0856-7890-1234',
                'email' => 'rina@frozenfood.id',
                'address' => 'Jl. Raya Bekasi Km 25, Bekasi',
                'lead_time_days' => 2,
            ],
            [
                'name' => 'UD Bahan Kue Makmur',
                'contact_person' => 'Dedi Kurniawan',
                'phone' => '0878-4567-8901',
                'email' => 'dedi@bahankue.co.id',
                'address' => 'Jl. Pasar Pagi No. 3, Jakarta Timur',
                'lead_time_days' => 1,
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }
    }
}
